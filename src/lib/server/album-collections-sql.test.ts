import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const media = "44444444-4444-4444-8444-444444444444";
const sql = (name: string) => readFile(new URL(`../../../supabase/${name}`, import.meta.url), "utf8");
const collection = async (user = owner, title = "旅行") => (await db.query<{ value: { id: string; revision: number } }>("select public.create_album_collection($1,$2,'说明') as value", [user, title])).rows[0].value;
const photo = async (id: string | null = null) => (await db.query<{ value: { id: string; revision: number } }>("select public.create_album_photo($1,$2,'花园','','',$3) as value", [owner, media, id])).rows[0].value;
const publish = (id: string, revision = 1, collectionId: string | null = null, user = owner) => db.query("select public.update_album_photo($1,$2,$3,'花园','','',true,$4)", [id,user,revision,collectionId]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;");
  await db.exec(await sql("migrations/202610120001_initial.sql"));
  await db.query(await sql("setup/query-album.sql"));
  await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,'blob/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg','image/jpeg',1,'ready')", [media,owner]);
  await db.query("select public.create_album_photo($1,$2,'old','','')", [owner,media]);
  const oldId = (await db.query<{id:string}>("select id from public.album_photos")).rows[0].id;
  await db.query("select public.update_album_photo($1,$2,1,'old','','',true)",[oldId,owner]);
  await db.query(await sql("setup/query-album-collections.sql"));
  expect((await db.query("select caption,collection_id,published from public.album_photos")).rows).toEqual([{caption:"old",collection_id:null,published:true}]);
  expect((await db.query("select caption,collection_id from public.published_album_photos")).rows).toEqual([{caption:"old",collection_id:null}]);
  expect((await db.query("select title,photo_count from public.published_album_collections")).rows).toEqual([{title:"未分组",photo_count:1}]);
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate public.published_album_photos,public.album_photos,public.album_collections,public.media;");
  await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,'blob/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg','image/jpeg',1,'ready')", [media,owner]);
  await db.exec("set role service_role");
});
it("upgrade has matching single-query script, is repeat-safe and preserves old schema/data", async () => {
  expect(await sql("setup/query-album-collections.sql")).toBe(await sql("migrations/202610210001_album_collections.sql"));
  const c = await collection();
  const p = await photo(c.id);
  await db.exec("reset role");
  await db.query(await sql("setup/query-album-collections.sql"));
  await db.exec("set role service_role");
  expect((await db.query("select id,collection_id from public.album_photos")).rows).toEqual([{id:p.id,collection_id:c.id}]);
  await db.query("select public.update_album_photo($1,$2,1,'old client','','',true)", [p.id,owner]);
  expect((await db.query("select collection_id from public.published_album_photos")).rows).toEqual([{collection_id:c.id}]);
});
it("private collections stay private; only explicitly published snapshots provide safe public aggregates", async () => {
  const c = await collection(); const privateCollection = await collection(owner,"私密");
  const p = await photo(c.id);
  await db.exec("set role anon");
  expect((await db.query("select * from public.published_album_collections")).rows).toEqual([]);
  await expect(db.query("select * from public.album_collections")).rejects.toThrow(/permission denied/);
  await expect(collection()).rejects.toThrow(/permission denied/);
  await db.exec("set role service_role"); await publish(p.id,1,c.id);
  for (const role of ["anon","authenticated"]) {
    await db.exec(`set role ${role}`);
    expect((await db.query("select * from public.published_album_collections")).rows).toEqual([{collection_id:c.id,title:"旅行",description:"说明",photo_count:1,cover_storage_key:"blob/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg"}]);
    await expect(db.query("select * from public.album_photos")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.remove_album_collection($1,$2,1)",[privateCollection.id,owner])).rejects.toThrow(/permission denied/);
  }
});
it("refuses forged collection ownership, invalid media and stale revisions without writes", async () => {
  const c = await collection(foreign);
  await expect(photo(c.id)).rejects.toThrow(/COLLECTION_NOT_FOUND/);
  const p = await photo();
  await expect(publish(p.id,1,c.id)).rejects.toThrow(/COLLECTION_NOT_FOUND/);
  await expect(publish(p.id,1,null,foreign)).rejects.toThrow(/NOT_FOUND/);
  await db.query("update public.media set status='pending'");
  await expect(publish(p.id)).rejects.toThrow(/MEDIA_NOT_READY/);
  expect((await db.query("select revision::int as revision,published,collection_id from public.album_photos")).rows).toEqual([{revision:1,published:false,collection_id:null}]);
  await expect(db.query("select public.update_album_collection($1,$2,1,'fake','')", [c.id,owner])).rejects.toThrow(/NOT_FOUND/);
  await expect(db.query("select public.remove_album_collection($1,$2,null)", [c.id,foreign])).rejects.toThrow(/COLLECTION_CONFLICT/);
});
it("moves/renames published snapshots and deletes collections without deleting any photo/media", async () => {
  const first = await collection(); const second = await collection(owner,"冬天"); const p = await photo(first.id);
  await publish(p.id,1,first.id);
  await db.query("select public.update_album_collection($1,$2,1,'夏天','新说明')", [first.id,owner]);
  expect((await db.query("select title,description from public.published_album_collections")).rows).toEqual([{title:"夏天",description:"新说明"}]);
  await expect(db.query("select public.remove_album_collection($1,$2,1)", [first.id,owner])).rejects.toThrow(/COLLECTION_CONFLICT/);
  await publish(p.id,2,second.id);
  expect((await db.query("select title from public.published_album_collections")).rows).toEqual([{title:"冬天"}]);
  await db.query("select public.remove_album_collection($1,$2,1)", [second.id,owner]);
  expect((await db.query("select revision::int as revision,collection_id,published from public.album_photos")).rows).toEqual([{revision:4,collection_id:null,published:true}]);
  expect((await db.query("select collection_id,title from public.published_album_collections")).rows).toEqual([{collection_id:null,title:"未分组"}]);
  await expect(publish(p.id,3)).rejects.toThrow(/ALBUM_CONFLICT/);
  expect((await db.query("select id from public.media")).rows).toEqual([{id:media}]);
  const list = (await db.query<{value: {id:string; photo_count:number}[]}>("select public.list_album_collections($1) as value", [owner])).rows[0].value;
  expect(list).toHaveLength(1); expect(list[0]).toMatchObject({id:first.id,photo_count:0});
});
it("collection deletion also increments private photo revisions without publishing them", async () => {
  const c = await collection(); const p = await photo(c.id);
  await db.query("select public.remove_album_collection($1,$2,1)", [c.id,owner]);
  expect((await db.query("select id,revision::int as revision,collection_id,published from public.album_photos")).rows).toEqual([{id:p.id,revision:2,collection_id:null,published:false}]);
  expect((await db.query("select * from public.published_album_collections")).rows).toEqual([]);
});

it.each([ ["pending",owner,"image/jpeg"], ["ready",foreign,"image/jpeg"], ["ready",owner,"video/mp4"] ])("new collection-aware create still rejects %s/%s/%s media", async (status,user,mime) => {
  const c = await collection();
  await db.query("update public.media set status=$1,owner_id=$2,mime_type=$3",[status,user,mime]);
  await expect(photo(c.id)).rejects.toThrow(/MEDIA_NOT_READY/);
  expect((await db.query("select id from public.album_photos")).rows).toEqual([]);
});
it("database rejects invalid collection metadata and preserves snapshots", async () => {
  const c = await collection(); const p = await photo(c.id); await publish(p.id,1,c.id);
  for (const title of [" ","a".repeat(101)]) {
    await expect(db.query("select public.update_album_collection($1,$2,1,$3,'')",[c.id,owner,title])).rejects.toThrow(/check constraint/);
  }
  await expect(db.query("select public.update_album_collection($1,$2,1,'new',$3)",[c.id,owner,"a".repeat(1001)])).rejects.toThrow(/check constraint/);
  expect((await db.query("select title,revision::int as revision from public.album_collections")).rows).toEqual([{title:"旅行",revision:1}]);
  expect((await db.query("select title from public.published_album_collections")).rows).toEqual([{title:"旅行"}]);
});
