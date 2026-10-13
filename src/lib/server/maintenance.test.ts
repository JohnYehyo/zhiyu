import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { literalSearchPattern } from "../admin/queries";

let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const other = "55555555-5555-4555-8555-555555555555";
const mediaId = "44444444-4444-4444-8444-444444444444";
const key = `blob/${owner}/${mediaId}.jpg`;
const draft = {
  title: "第一篇日记",
  slug: "first-journal",
  category: "日常",
  excerpt: "",
  coverKey: key,
  content: { type: "doc", content: [] },
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
  );
  await db.exec(
    await readFile(
      new URL(
        "../../../supabase/migrations/202610120001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  try {
    await db.exec(
      await readFile(
        new URL(
          "../../../supabase/migrations/202610130001_maintenance.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}, 30000);
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.published_posts,public.draft_posts,public.media;",
  );
  await db.query(
    "insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'ready')",
    [mediaId, owner, key],
  );
  await db.query(
    "insert into public.draft_posts(id,owner_id,draft) values($1,$2,$3),($4,$5,$6)",
    [
      id,
      owner,
      JSON.stringify(draft),
      other,
      foreign,
      JSON.stringify({ ...draft, slug: "other-journal", coverKey: "" }),
    ],
  );
});

it("maintenance status follows draft, published snapshot, newer draft, and withdrawal", async () => {
  const status = async () =>
    (
      await db.query<{ status: string }>(
        "select status from public.draft_posts where id=$1",
        [id],
      )
    ).rows[0].status;
  await expect(status()).resolves.toBe("draft");
  await db.query("select public.publish_post($1,$2,1)", [id, owner]);
  expect(await status()).toBe("published");
  await db.query("select public.save_draft($1,$2,1,$3)", [
    id,
    owner,
    JSON.stringify({ ...draft, title: "未发布修改" }),
  ]);
  expect(await status()).toBe("changed");
  await db.query("select public.unpublish_post($1,$2,2)", [id, owner]);
  expect(await status()).toBe("draft");
});

it("deleting an owned revision atomically removes its public page but retains shared media and other owners", async () => {
  await db.exec("set role service_role");
  await db.query("select public.publish_post($1,$2,1)", [id, owner]);
  await expect(
    db.query<{ result: string }>(
      "select public.delete_post($1,$2,1) as result",
      [id, owner],
    ),
  ).resolves.toMatchObject({ rows: [{ result: id }] });
  expect(
    (await db.query("select id from public.published_posts where id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select id from public.draft_posts where id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select id from public.draft_posts where id=$1", [other]))
      .rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select id from public.media where id=$1", [mediaId])).rows,
  ).toHaveLength(1);
});

it("stale or null revisions and a foreign owner cannot delete the draft or its published snapshot", async () => {
  await db.query("select public.publish_post($1,$2,1)", [id, owner]);
  await db.query("select public.save_draft($1,$2,1,$3)", [
    id,
    owner,
    JSON.stringify(draft),
  ]);
  for (const revision of [1, null]) {
    await expect(
      db.query("select public.delete_post($1,$2,$3)", [id, owner, revision]),
    ).rejects.toThrow(/REVISION_CONFLICT/);
  }
  await expect(
    db.query("select public.delete_post($1,$2,2)", [id, foreign]),
  ).rejects.toThrow(/NOT_FOUND/);
  expect(
    (await db.query("select id from public.draft_posts where id=$1", [id]))
      .rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select id from public.published_posts where id=$1", [id]))
      .rows,
  ).toHaveLength(1);
});

it("public roles cannot execute article deletion or read media metadata", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(
      db.query("select public.delete_post($1,$2,1)", [id, owner]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("select original_name from public.media"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  }
});
it("title search treats SQL wildcards and punctuation as literal text", async () => {
  await db.query(
    "update public.draft_posts set draft=jsonb_set(draft,'{title}',to_jsonb($1::text)) where id=$2",
    ["今天,(雨)%_", id],
  );
  const result = await db.query<{ id: string }>(
    "select id from public.draft_posts where owner_id=$1 and draft->>'title' ilike $2",
    [owner, literalSearchPattern("(雨)%_")],
  );
  expect(result.rows).toEqual([{ id }]);
  expect(
    (
      await db.query(
        "select id from public.draft_posts where draft->>'title' ilike $1",
        [literalSearchPattern("(雨)xx")],
      )
    ).rows,
  ).toHaveLength(0);
});
