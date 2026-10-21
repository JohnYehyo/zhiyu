import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";

let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const sql = (name: string) => readFile(new URL(`../../../supabase/${name}`, import.meta.url), "utf8");
type Collection = { id: string; revision: number; cover_photo_id: string | null; photo_count: number };
type Photo = { id: string; revision: number; storage_key: string; media_id: string };
const collection = async (user = owner) => (await db.query<{value:Collection}>("select public.create_album_collection($1,'旅行','说明') as value",[user])).rows[0].value;
async function photo(collectionId: string | null, date = "2026-01-01", user = owner, published = true): Promise<Photo> {
  const media = (await db.query<{id:string}>("insert into public.media(owner_id,storage_key,mime_type,size,status) values($1::uuid,'blob/' || $1::text || '/' || gen_random_uuid() || '.jpg','image/jpeg',1,'ready') returning id",[user])).rows[0].id;
  const created = (await db.query<{value:Photo}>("select public.create_album_photo($1,$2,'照片','',$3,$4) as value",[user,media,date,collectionId])).rows[0].value;
  return published ? (await db.query<{value:Photo}>("select public.update_album_photo($1,$2,1,'照片','',$3,true,$4) as value",[created.id,user,date,collectionId])).rows[0].value : created;
}
const setCover = async (c: Collection, photoId: string | null, user = owner) => (await db.query<{value:Collection}>("select public.set_album_collection_cover($1,$2,$3,$4) as value",[c.id,user,c.revision,photoId])).rows[0].value;
const cover = async (id: string) => (await db.query<{cover_storage_key:string}>("select cover_storage_key from public.published_album_collections where collection_id=$1",[id])).rows[0]?.cover_storage_key;
const listed = async (id: string) => (await db.query<{value:Collection[]}>("select public.list_album_collections($1) as value",[owner])).rows[0].value.find(c=>c.id===id)!;

beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;");
  await db.exec(await sql("migrations/202610120001_initial.sql"));
  await db.query(await sql("setup/query-album.sql"));
  await db.query(await sql("setup/query-album-collections.sql"));
  const c = await collection(); const p = await photo(c.id);
  const privatePhoto = await photo(c.id,"2026-02-01",owner,false);
  const before = (await db.query("select * from public.album_photos order by id")).rows;
  await db.query(await sql("setup/query-album-covers.sql"));
  expect((await db.query("select * from public.album_photos order by id")).rows).toEqual(before);
  expect((await db.query("select id,is_collection_cover from public.published_album_photos")).rows).toEqual([{id:p.id,is_collection_cover:false}]);
  expect(await cover(c.id)).toBe(p.storage_key);
  expect((await listed(c.id)).cover_photo_id).toBeNull();
  expect((await db.query("select published from public.album_photos where id=$1",[privatePhoto.id])).rows).toEqual([{published:false}]);
},30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => { await db.exec("reset role; truncate public.published_album_photos,public.album_photos,public.album_collections,public.media; set role service_role;"); });

it("matches the one-query setup script and repeated upgrade preserves a selected cover and data",async()=>{
  expect(await sql("setup/query-album-covers.sql")).toBe(await sql("migrations/202610210002_album_covers.sql"));
  const c = await collection(); const p = await photo(c.id); const chosen = await setCover(c,p.id);
  await db.exec("reset role"); await db.query(await sql("setup/query-album-covers.sql")); await db.exec("set role service_role");
  expect(await listed(c.id)).toMatchObject({revision:chosen.revision,cover_photo_id:p.id,photo_count:1});
  expect(await cover(c.id)).toBe(p.storage_key);
});
it("keeps an older manual cover across newer inserts, caption edits, republishing and collection rename",async()=>{
  const c = await collection(); const older = await photo(c.id); const newer = await photo(c.id,"2026-02-01");
  expect(await cover(c.id)).toBe(newer.storage_key);
  const chosen = await setCover(c,older.id);
  expect(chosen).toMatchObject({revision:2,cover_photo_id:older.id,photo_count:2});
  const newest = await photo(c.id,"2026-03-01");
  await db.query("select public.update_album_photo($1,$2,2,'新图注','','2026-01-01',true)",[older.id,owner]);
  const renamed = (await db.query<{value:Collection}>("select public.update_album_collection($1,$2,2,'新名称','新说明') as value",[c.id,owner])).rows[0].value;
  expect(renamed).toMatchObject({revision:3,cover_photo_id:older.id,photo_count:3});
  expect(await cover(c.id)).toBe(older.storage_key);
  expect((await db.query<{revision:number}>("select revision::int as revision from public.album_photos where id=$1",[newer.id])).rows[0].revision).toBe(2);
  const reset = await setCover(renamed,null);
  expect(reset).toMatchObject({revision:4,cover_photo_id:null});
  expect(await cover(c.id)).toBe(newest.storage_key);
});
it.each(["withdraw","delete","move","unassign"])("falls back when the selected cover is removed by %s",async(action)=>{
  const c = await collection(); const old = await photo(c.id); const newer = await photo(c.id,"2026-02-01");
  await setCover(c,old.id);
  if(action === "delete") await db.query("select public.remove_album_photo($1,$2,2)",[old.id,owner]);
  else {
    const destination = action === "move" ? (await collection()).id : action === "unassign" ? null : c.id;
    await db.query("select public.update_album_photo($1,$2,2,'照片','','2026-01-01',$3,$4)",[old.id,owner,action !== "withdraw",destination]);
    if(action === "move" || action === "unassign") expect((await db.query("select is_collection_cover from public.published_album_photos where id=$1",[old.id])).rows).toEqual([{is_collection_cover:false}]);
  }
  expect(await cover(c.id)).toBe(newer.storage_key);
  expect((await listed(c.id)).cover_photo_id).toBeNull();
  if(action !== "delete") {
    await db.query("select public.update_album_photo($1,$2,3,'照片','','2026-01-01',true,$3)",[old.id,owner,c.id]);
    expect(await cover(c.id)).toBe(newer.storage_key);
    expect((await listed(c.id)).cover_photo_id).toBeNull();
  }
});
it("collection deletion clears the flag while retaining all public photos in unassigned",async()=>{
  const c = await collection(); const p = await photo(c.id); await setCover(c,p.id);
  await db.query("select public.remove_album_collection($1,$2,2)",[c.id,owner]);
  expect((await db.query("select collection_id,is_collection_cover from public.published_album_photos")).rows).toEqual([{collection_id:null,is_collection_cover:false}]);
  expect((await db.query("select id from public.media")).rows).toHaveLength(1);
});
it("rejects owner/member/private/revision faults atomically without publishing private photos",async()=>{
  const c = await collection(); const p = await photo(c.id); await setCover(c,p.id);
  const privatePhoto = await photo(c.id,"2026-02-01",owner,false);
  const other = await photo((await collection()).id);
  const foreignPhoto = await photo((await collection(foreign)).id,"2026-02-01",foreign);
  await expect(setCover(c,null)).rejects.toThrow(/COLLECTION_CONFLICT/);
  await expect(setCover({...c,revision:2},p.id,foreign)).rejects.toThrow(/COLLECTION_NOT_FOUND/);
  await expect(setCover({...c,revision:null as unknown as number},null)).rejects.toThrow(/COLLECTION_CONFLICT/);
  for(const id of [privatePhoto.id,other.id,foreignPhoto.id,"99999999-9999-4999-8999-999999999999"])
    await expect(setCover({...c,revision:2},id)).rejects.toThrow(/ALBUM_COVER_INVALID/);
  expect(await listed(c.id)).toMatchObject({revision:2,cover_photo_id:p.id});
  expect((await db.query("select id from public.published_album_photos where id=$1",[privatePhoto.id])).rows).toEqual([]);
});
it.each(["pending","foreign","video","media-key","snapshot-key","snapshot-group"])("refuses a cover with invalid media/snapshot %s",async(kind)=>{
  const c = await collection(); const selected = await photo(c.id); const candidate = await photo(c.id); await setCover(c,selected.id);
  if(kind === "pending") await db.query("update public.media set status='pending' where id=$1",[candidate.media_id]);
  if(kind === "foreign") await db.query("update public.media set owner_id=$1 where id=$2",[foreign,candidate.media_id]);
  if(kind === "video") await db.query("update public.media set mime_type='video/mp4' where id=$1",[candidate.media_id]);
  if(kind === "media-key") await db.query("update public.media set storage_key=replace(storage_key,'.jpg','.png') where id=$1",[candidate.media_id]);
  if(kind === "snapshot-key") await db.query("update public.published_album_photos set storage_key='different' where id=$1",[candidate.id]);
  if(kind === "snapshot-group") await db.query("update public.published_album_photos set collection_id=null where id=$1",[candidate.id]);
  await expect(setCover({...c,revision:2},candidate.id)).rejects.toThrow(/ALBUM_COVER_INVALID/);
  expect(await listed(c.id)).toMatchObject({revision:2,cover_photo_id:selected.id});
});
it("allows one flag per collection and replaces the selection atomically",async()=>{
  const c = await collection(); const first = await photo(c.id); const second = await photo(c.id); const chosen = await setCover(c,first.id);
  await expect(db.query("update public.published_album_photos set is_collection_cover=true where id=$1",[second.id])).rejects.toThrow(/unique/);
  await setCover(chosen,second.id);
  expect((await db.query("select id from public.published_album_photos where is_collection_cover")).rows).toEqual([{id:second.id}]);
});
it("public roles read only snapshot aggregates and cannot execute cover/private collection functions",async()=>{
  const c = await collection(); const p = await photo(c.id); await setCover(c,p.id);
  for(const role of ["anon","authenticated"]) {
    await db.exec(`set role ${role}`);
    expect(await cover(c.id)).toBe(p.storage_key);
    await expect(setCover({...c,revision:2},null)).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.album_collections")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.album_photos")).rejects.toThrow(/permission denied/);
  }
});
