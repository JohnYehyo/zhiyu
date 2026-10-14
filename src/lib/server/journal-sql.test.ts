import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";

let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const mid = "44444444-4444-4444-8444-444444444444";
const cloudKey = `blob/${owner}/${mid}.jpg`;
const draft = { title: "小记", slug: "journal", excerpt: "", category: "日记", coverKey: "", content: { type: "doc", content: [] } };
const sql = (path: string) => readFile(new URL(`../../../supabase/${path}`, import.meta.url), "utf8");
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;");
  await db.exec(await sql("migrations/202610120001_initial.sql"));
  await db.exec(await sql("migrations/202610130001_maintenance.sql"));
  await db.exec(await sql("migrations/202610140001_journal.sql"));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate public.published_posts,public.draft_posts,public.media;");
});
async function create(value: unknown) {
  await db.query("insert into public.draft_posts(id,owner_id,draft) values($1,$2,$3)", [id, owner, JSON.stringify(value)]);
  await db.exec("set role service_role");
}
const publish = (user = owner, revision = 1) => db.query("select public.publish_post($1,$2,$3)", [id, user, revision]);

it.each(["picnic", "meadow", "flowers", "sea", "window", "sun"])("publishes the approved %s illustration and bounded journal metadata without media rows", async (name) => {
  const storageKey = `/assets/${name}.svg`;
  const content = { type: "doc", content: [
    { type: "blockquote", attrs: { tone: "mint", attribution: "芝语" }, content: [{ type: "paragraph", content: [{ type: "text", text: "记住这一刻" }] }] },
    { type: "image", attrs: { storageKey, src: storageKey, caption: "花园", alt: "午后", layout: "pair", date: "2026.10.14" } },
  ] };
  await create({ ...draft, coverKey: storageKey, content });
  await publish();
  const result = (await db.query<{ draft: { coverKey: string; content: { content: { attrs: object }[] } } }>("select draft from public.published_posts")).rows[0].draft;
  expect(result.coverKey).toBe(storageKey);
  expect(result.content.content[0].attrs).toEqual({ tone: "mint", attribution: "芝语" });
  expect(result.content.content[1].attrs).toEqual({ storageKey, caption: "花园", alt: "午后", layout: "pair", date: "2026.10.14" });
  expect((await db.query("select count(*)::int as count from public.media")).rows).toEqual([{ count: 0 }]);
});
it.each(["/assets/unknown.svg", "/assets/picnic.svg?x", "blob/unverified.png"])("rejects unapproved cover and body keys atomically: %s", async (storageKey) => {
  await create({ ...draft, coverKey: storageKey });
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  await db.query("update public.draft_posts set draft=$2 where id=$1", [id, JSON.stringify({ ...draft, content: { type: "doc", content: [{ type: "image", attrs: { storageKey } }] } })]);
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  expect((await db.query("select published_revision from public.draft_posts")).rows).toEqual([{ published_revision: null }]);
  expect((await db.query("select count(*)::int as count from public.published_posts")).rows).toEqual([{ count: 0 }]);
});
it("retains owner, ready status, media type and preview stripping for uploaded images", async () => {
  await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'pending')", [mid, owner, cloudKey]);
  await create({ ...draft, coverKey: cloudKey, content: { type: "doc", content: [{ type: "image", attrs: { mediaId: mid, storageKey: cloudKey, src: "blob:preview", layout: "pair", date: "今天" } }] } });
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  await db.query("update public.media set status='ready',owner_id=$1", [foreign]);
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  await db.query("update public.media set owner_id=$1,mime_type='video/mp4'", [owner]);
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  await db.query("update public.media set mime_type='image/jpeg'");
  await publish();
  expect((await db.query("select draft#>'{content,content,0,attrs}' as attrs from public.published_posts")).rows).toEqual([{ attrs: { mediaId: mid, storageKey: cloudKey, layout: "pair", date: "今天" } }]);
});
it("preserves immutable snapshots, ownership, revision checks and restricted RPC access", async () => {
  await create({ ...draft, coverKey: "/assets/sun.svg" });
  await expect(publish(foreign)).rejects.toThrow(/NOT_FOUND/);
  await publish();
  await db.query("select public.save_draft($1,$2,1,$3)", [id, owner, JSON.stringify({ ...draft, title: "修改" })]);
  await expect(publish()).rejects.toThrow(/REVISION_CONFLICT/);
  expect((await db.query("select draft->>'title' as title from public.published_posts")).rows).toEqual([{ title: "小记" }]);
  await db.exec("set role anon");
  await expect(publish()).rejects.toThrow(/permission denied/);
});

it("does not extend the builtin exemption to video or fabricated media identities", async () => {
  await create({ ...draft, content: { type: "doc", content: [{ type: "video", attrs: { storageKey: "/assets/picnic.svg" } }] } });
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
  await db.query("update public.draft_posts set draft=$2 where id=$1", [id, JSON.stringify({ ...draft, content: { type: "doc", content: [{ type: "image", attrs: { storageKey: "/assets/picnic.svg", mediaId: mid } }] } })]);
  await expect(publish()).rejects.toThrow(/MEDIA_NOT_READY/);
});

it.each(["setup/query-bootstrap.sql", "migrations/202610120001_initial.sql"])("upgrades %s through one prepared query while preserving data and permissions", async (initialPath) => {
  const existing = new PGlite();
  try {
    await existing.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;");
    if (initialPath.startsWith("setup/")) await existing.query(await sql(initialPath));
    else await existing.exec(await sql(initialPath));
    await existing.query("insert into public.draft_posts(id,owner_id,draft) values($1,$2,$3)", [id, owner, JSON.stringify({ ...draft, coverKey: "/assets/window.svg" })]);
    const upgrade = await sql("setup/query-journal.sql");
    await existing.query(upgrade);
    await existing.query(upgrade);
    await existing.exec("set role service_role");
    await existing.query("select public.publish_post($1,$2,1)", [id, owner]);
    expect((await existing.query("select draft->>'coverKey' as cover from public.published_posts")).rows).toEqual([{ cover: "/assets/window.svg" }]);
    expect((await existing.query("select revision::int as revision from public.draft_posts")).rows).toEqual([{ revision: 1 }]);
    expect((await existing.query("select has_function_privilege('anon','public.snapshot_node(jsonb,uuid)','execute') as anon_snapshot, has_function_privilege('authenticated','public.publish_post(uuid,uuid,bigint)','execute') as auth_publish, has_function_privilege('service_role','public.publish_post(uuid,uuid,bigint)','execute') as service_publish")).rows).toEqual([{ anon_snapshot: false, auth_publish: false, service_publish: true }]);
  } finally { await existing.close(); }
}, 30000);
