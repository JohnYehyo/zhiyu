import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";

let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const mediaId = "44444444-4444-4444-8444-444444444444";
const key = `blob/${owner}/${mediaId}.jpg`;
const sql = (path: string) => readFile(new URL(`../../../supabase/${path}`, import.meta.url), "utf8");
const roles = "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;";
const create = (user = owner) => db.query<{ photo: { id: string; revision: number; published: boolean; storage_key: string } }>("select public.create_album_photo($1,$2,'花园','午后','2026-10-14') as photo", [user, mediaId]);
const update = (id: string, revision: number | null = 1, published = true, user = owner, caption = "新图注") => db.query("select public.update_album_photo($1,$2,$3,$4,'说明','2026-10-15',$5)", [id, user, revision, caption, published]);
const remove = (id: string, revision: number | null = 1, user = owner) => db.query("select public.remove_album_photo($1,$2,$3) as id", [id, user, revision]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(roles);
  await db.exec(await sql("migrations/202610120001_initial.sql"));
  try { await db.query(await sql("migrations/202610140002_album.sql")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role");
  if ((await db.query<{ name: string | null }>("select to_regclass('public.album_photos') as name")).rows[0].name)
    await db.exec("truncate public.published_album_photos, public.album_photos, public.media");
  else await db.exec("truncate public.media");
  await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'ready')", [mediaId, owner, key]);
  await db.exec("set role service_role");
});

it("creates an independent private photo and rejects duplicate owner/media membership", async () => {
  const { photo } = (await create()).rows[0];
  expect(photo).toMatchObject({ revision: 1, published: false, storage_key: key });
  expect((await db.query("select id from public.published_album_photos")).rows).toEqual([]);
  await expect(create()).rejects.toThrow(/ALBUM_DUPLICATE/);
  expect((await db.query("select count(*)::int as count from public.album_photos")).rows).toEqual([{ count: 1 }]);
  expect((await db.query("select id from public.draft_posts")).rows).toEqual([]);
});
it.each([
  ["pending", owner, "image/jpeg"],
  ["ready", foreign, "image/jpeg"],
  ["ready", owner, "video/mp4"],
])("rejects %s media owned by %s of type %s", async (status, user, mime) => {
  await db.query("update public.media set status=$1,owner_id=$2,mime_type=$3", [status, user, mime]);
  await expect(create()).rejects.toThrow(/MEDIA_NOT_READY/);
  expect((await db.query("select id from public.album_photos")).rows).toEqual([]);
});
it("checks owner and exact revision before atomic publication, metadata refresh and withdrawal", async () => {
  const id = (await create()).rows[0].photo.id;
  await expect(update(id, 1, true, foreign)).rejects.toThrow(/NOT_FOUND/);
  await expect(update(id, null)).rejects.toThrow(/ALBUM_CONFLICT/);
  await update(id);
  await expect(update(id)).rejects.toThrow(/ALBUM_CONFLICT/);
  await expect(remove(id, 1)).rejects.toThrow(/ALBUM_CONFLICT/);
  await update(id, 2, true, owner, "已同步");
  expect((await db.query("select caption,taken_on,storage_key from public.published_album_photos")).rows).toEqual([{ caption: "已同步", taken_on: "2026-10-15", storage_key: key }]);
  await update(id, 3, false);
  expect((await db.query("select id from public.published_album_photos")).rows).toEqual([]);
  expect((await db.query("select revision::int as revision,published from public.album_photos")).rows).toEqual([{ revision: 4, published: false }]);
});
it("rechecks exact ready image on publishing and rolls back metadata when media changed", async () => {
  const id = (await create()).rows[0].photo.id;
  for (const changes of ["status='pending'", "owner_id='22222222-2222-4222-8222-222222222222'", "mime_type='video/mp4'"]) {
    await db.query(`update public.media set ${changes}`);
    await expect(update(id)).rejects.toThrow(/MEDIA_NOT_READY/);
    expect((await db.query("select revision::int as revision,caption,published from public.album_photos")).rows).toEqual([{ revision: 1, caption: "花园", published: false }]);
    await db.query("update public.media set status='ready',owner_id=$1,mime_type='image/jpeg'", [owner]);
  }
  await db.query("update public.media set storage_key=$1", [`blob/${owner}/${mediaId}.png`]);
  await expect(update(id)).rejects.toThrow(/MEDIA_NOT_READY/);
  expect((await db.query("select id from public.published_album_photos")).rows).toEqual([]);
});
it("removes only album links and snapshot while retaining source media", async () => {
  const id = (await create()).rows[0].photo.id;
  await update(id);
  await expect(remove(id, 2, foreign)).rejects.toThrow(/NOT_FOUND/);
  await expect(remove(id, null)).rejects.toThrow(/ALBUM_CONFLICT/);
  expect((await remove(id, 2)).rows).toEqual([{ id }]);
  expect((await db.query("select id from public.album_photos")).rows).toEqual([]);
  expect((await db.query("select id from public.published_album_photos")).rows).toEqual([]);
  expect((await db.query("select id from public.media")).rows).toEqual([{ id: mediaId }]);
});
it("anon and authenticated can read only published columns and cannot call write RPCs", async () => {
  const id = (await create()).rows[0].photo.id;
  await db.exec("set role anon");
  expect((await db.query("select * from public.published_album_photos")).rows).toEqual([]);
  await db.exec("set role service_role");
  await update(id);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    const rows = (await db.query<Record<string, unknown>>("select * from public.published_album_photos")).rows;
    expect(Object.keys(rows[0]).sort()).toEqual(["alt", "caption", "id", "published_at", "sort_date", "storage_key", "taken_on"]);
    await expect(db.query("select * from public.album_photos")).rejects.toThrow(/permission denied/);
    await expect(create()).rejects.toThrow(/permission denied/);
    await expect(update(id, 2)).rejects.toThrow(/permission denied/);
    await expect(remove(id, 2)).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.published_album_photos")).rejects.toThrow(/permission denied/);
  }
});
it.each(["2025-02-29", "2026-04-31", "0000-01-01", "2026-1-1"])("database rejects invalid calendar date %s without writes", async (date) => {
  await expect(db.query("select public.create_album_photo($1,$2,'','',$3)", [owner, mediaId, date])).rejects.toThrow();
  expect((await db.query("select id from public.album_photos")).rows).toEqual([]);
});
it("prepared upgrade preserves existing blog and rejects repeat or missing-media initialization safely", async () => {
  const existing = new PGlite();
  const blank = new PGlite();
  try {
    await existing.exec(roles);
    await existing.query(await sql("setup/query-bootstrap.sql"));
    const upgrade = await sql("setup/query-album.sql");
    await existing.query(upgrade);
    await expect(existing.query(upgrade)).rejects.toThrow(/ALBUM_ALREADY_INITIALIZED/);
    expect((await existing.query("select count(*)::int as count from public.media")).rows).toEqual([{ count: 0 }]);
    await expect(blank.query(upgrade)).rejects.toThrow(/ALBUM_MEDIA_REQUIRED/);
    expect((await blank.query<{ name: string | null }>("select to_regclass('public.album_photos') as name")).rows).toEqual([{ name: null }]);
    expect((await existing.query("select proname,prosecdef from pg_proc where proname in ('create_album_photo','update_album_photo','remove_album_photo') order by proname")).rows).toEqual([
      { proname: "create_album_photo", prosecdef: false }, { proname: "remove_album_photo", prosecdef: false }, { proname: "update_album_photo", prosecdef: false },
    ]);
  } finally { await existing.close(); await blank.close(); }
}, 30000);

it("orders empty dates by original creation day and keeps the public date empty", async () => {
  const id = (await create()).rows[0].photo.id;
  await db.query("update public.album_photos set created_at='2026-10-16T08:00:00Z' where id=$1", [id]);
  await db.query("select public.update_album_photo($1,$2,1,'new','', '',true)", [id, owner]);
  const secondMediaId = "55555555-5555-4555-8555-555555555555";
  await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'ready')", [secondMediaId, owner, `blob/${owner}/${secondMediaId}.jpg`]);
  const second = (await db.query<{ photo: { id: string } }>("select public.create_album_photo($1,$2,'older','','2026-10-15') as photo", [owner, secondMediaId])).rows[0].photo.id;
  await update(second);
  await db.exec("set role anon");
  expect((await db.query("select caption,taken_on,sort_date from public.published_album_photos order by sort_date desc,published_at desc,id desc")).rows).toEqual([
    { caption: "new", taken_on: "", sort_date: "2026-10-16" },
    { caption: "新图注", taken_on: "2026-10-15", sort_date: "2026-10-15" },
  ]);
});
it("database metadata limits also protect direct RPC calls, preserving existing snapshots", async () => {
  const id = (await create()).rows[0].photo.id;
  await update(id);
  await expect(update(id, 2, true, owner, "a".repeat(1001))).rejects.toThrow(/check constraint/);
  await expect(db.query("select public.update_album_photo($1,$2,2,'',$3,'',true)", [id, owner, "a".repeat(501)])).rejects.toThrow(/check constraint/);
  await expect(db.query("select public.update_album_photo($1,$2,2,'','','',null)", [id, owner])).rejects.toThrow(/null value/);
  expect((await db.query("select revision::int as revision,caption,published from public.album_photos")).rows).toEqual([{ revision: 2, caption: "新图注", published: true }]);
  expect((await db.query("select caption from public.published_album_photos")).rows).toEqual([{ caption: "新图注" }]);
});
