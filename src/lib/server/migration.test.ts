import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111",
  foreign = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333",
  mid = "44444444-4444-4444-8444-444444444444";
const key = `blob/${owner}/${mid}.jpg`;
const draft = {
  title: "Original",
  slug: "hello",
  excerpt: "",
  category: "日记",
  coverKey: "",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Original text" }] },
    ],
  },
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
}, 30000);
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.published_posts,public.draft_posts,public.media;",
  );
  await db.query(
    "insert into public.draft_posts(id,owner_id,draft) values ($1,$2,$3)",
    [id, owner, JSON.stringify(draft)],
  );
});
async function rpc(name: string, args: unknown[]) {
  return db.query(
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
}
it("anonymous and authenticated roles cannot read private tables or invoke publish RPC", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(db.query("select * from public.draft_posts")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query("select * from public.media")).rejects.toThrow(
      /permission denied/,
    );
    await expect(rpc("publish_post", [id, owner, 1])).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role");
  }
});
it("published snapshot remains unchanged after draft edits; stale save/publish/unpublish conflict", async () => {
  await db.exec("set role service_role");
  await rpc("publish_post", [id, owner, 1]);
  await rpc("save_draft", [
    id,
    owner,
    1,
    JSON.stringify({ ...draft, title: "Changed" }),
  ]);
  await expect(
    rpc("save_draft", [id, owner, 1, JSON.stringify(draft)]),
  ).rejects.toThrow(/REVISION_CONFLICT/);
  await expect(rpc("publish_post", [id, owner, 1])).rejects.toThrow(
    /REVISION_CONFLICT/,
  );
  await expect(rpc("unpublish_post", [id, owner, 1])).rejects.toThrow(
    /REVISION_CONFLICT/,
  );
  await db.exec("set role anon");
  const result = await db.query<{ draft: typeof draft }>(
    "select draft from public.published_posts",
  );
  expect(result.rows[0]?.draft.title).toBe("Original");
});
it("cross-owner mutations cannot affect a draft", async () => {
  await db.exec("set role service_role");
  await expect(
    rpc("save_draft", [id, foreign, 1, JSON.stringify(draft)]),
  ).rejects.toThrow(/NOT_FOUND/);
  await expect(rpc("publish_post", [id, foreign, 1])).rejects.toThrow(
    /NOT_FOUND/,
  );
});
it("pending/foreign media blocks transaction; ready owned media permits snapshot without preview src", async () => {
  const mediaDraft = {
    ...draft,
    coverKey: key,
    content: {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            mediaId: mid,
            storageKey: key,
            src: "blob:preview",
            alt: "Photo",
          },
        },
      ],
    },
  };
  await db.query("update public.draft_posts set draft=$1 where id=$2", [
    JSON.stringify(mediaDraft),
    id,
  ]);
  await db.query(
    "insert into public.media(id,owner_id,storage_key,mime_type,size) values ($1,$2,$3,$4,$5)",
    [mid, owner, key, "image/jpeg", 100],
  );
  await db.exec("set role service_role");
  await expect(rpc("publish_post", [id, owner, 1])).rejects.toThrow(
    /MEDIA_NOT_READY/,
  );
  expect(
    (await db.query("select * from public.published_posts")).rows,
  ).toHaveLength(0);
  await db.exec("reset role");
  await db.query("update public.media set status='ready',owner_id=$1", [
    foreign,
  ]);
  await db.exec("set role service_role");
  await expect(rpc("publish_post", [id, owner, 1])).rejects.toThrow(
    /MEDIA_NOT_READY/,
  );
  await db.exec("reset role");
  await db.query("update public.media set owner_id=$1", [owner]);
  await db.exec("set role service_role");
  await rpc("publish_post", [id, owner, 1]);
  const published = await db.query<{ draft: typeof mediaDraft }>(
    "select draft from public.published_posts",
  );
  expect(published.rows[0].draft.content.content[0].attrs).toEqual({
    mediaId: mid,
    storageKey: key,
    alt: "Photo",
  });
  await rpc("unpublish_post", [id, owner, 1]);
  expect(
    (await db.query("select * from public.published_posts")).rows,
  ).toHaveLength(0);
});
it("duplicate public slugs rollback publication metadata", async () => {
  await rpc("publish_post", [id, owner, 1]);
  const second = "55555555-5555-4555-8555-555555555555";
  await db.query(
    "insert into public.draft_posts(id,owner_id,draft) values ($1,$2,$3)",
    [second, owner, JSON.stringify(draft)],
  );
  await expect(rpc("publish_post", [second, owner, 1])).rejects.toThrow(
    /duplicate key/,
  );
  const r = await db.query<{ published_revision: number | null }>(
    "select published_revision from public.draft_posts where id=$1",
    [second],
  );
  expect(r.rows[0].published_revision).toBeNull();
});
