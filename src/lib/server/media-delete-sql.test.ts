import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';
let db:PGlite;
const owner='11111111-1111-4111-8111-111111111111', id='44444444-4444-4444-8444-444444444444', key=`blob/${owner}/${id}.jpg`;
const load=(p:string)=>readFile(new URL(`../../../supabase/${p}`,import.meta.url),'utf8');
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;');await db.exec(await load('migrations/202610120001_initial.sql'));await db.exec(await load('migrations/202610130001_maintenance.sql'));await db.query(await load('setup/query-album.sql'));await db.query(await load('setup/query-album-collections.sql'));await db.query(await load('setup/query-album-media-view.sql'));await db.query(await load('setup/query-media-delete.sql'));},30000);
afterAll(async()=>db.close());
beforeEach(async()=>{await db.exec('reset role; truncate public.published_posts,public.draft_posts,public.published_album_photos,public.album_photos,public.album_collections,public.media');await db.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'ready')",[id,owner,key]);await db.exec('set role service_role')});
it('refuses deletion when a saved draft references an image, including nested nodes',async()=>{
 const draft={coverKey:'',content:{type:'doc',content:[{type:'image',attrs:{mediaId:id,storageKey:key}}]}};
 await db.query('insert into public.draft_posts(owner_id,draft) values($1,$2)',[owner,JSON.stringify(draft)]);
 await expect(db.query('select public.begin_media_delete($1,$2,null)',[owner,id])).rejects.toThrow(/MEDIA_IN_USE/);
 expect((await db.query('select status from public.media where id=$1',[id])).rows).toEqual([{status:'ready'}]);
});
it('blocks new draft references after deletion begins and allows retry and completion',async()=>{
 expect((await db.query<{key:string}>('select public.begin_media_delete($1,$2,null) as key',[owner,id])).rows[0].key).toBe(key);
 const draft={coverKey:key,content:{type:'doc'}};
 await expect(db.query('insert into public.draft_posts(owner_id,draft) values($1,$2)',[owner,JSON.stringify(draft)])).rejects.toThrow(/MEDIA_NOT_READY/);
 expect((await db.query<{key:string}>('select public.begin_media_delete($1,$2,null) as key',[owner,id])).rows[0].key).toBe(key);
 await db.query('select public.finish_media_delete($1,$2)',[owner,id]);
 expect((await db.query('select status from public.media where id=$1',[id])).rows).toEqual([{status:'deleted'}]);
});
it('keeps a published snapshot protected when its current draft no longer references the image',async()=>{
 const post='55555555-5555-4555-8555-555555555555';
 const clear={coverKey:'',content:{type:'doc'}}; const published={coverKey:key,content:{type:'doc'}};
 await db.query('insert into public.draft_posts(id,owner_id,draft) values($1,$2,$3)',[post,owner,JSON.stringify(clear)]);
 await db.query("insert into public.published_posts(id,slug,draft,published_at) values($1,'test',$2,now())",[post,JSON.stringify(published)]);
 await expect(db.query('select public.begin_media_delete($1,$2,null)',[owner,id])).rejects.toThrow(/MEDIA_IN_USE/);
});
it('checks owner and current album version before deleting',async()=>{
 const result=await db.query<{photo:{revision:number}}>("select public.create_album_photo($1,$2,'','','') as photo",[owner,id]);
 expect(result.rows[0].photo.revision).toBe(1);
 await expect(db.query('select public.begin_media_delete($1,$2,null)',[owner,id])).rejects.toThrow(/ALBUM_CONFLICT/);
 await expect(db.query('select public.begin_media_delete($1,$2,1)',['22222222-2222-4222-8222-222222222222',id])).rejects.toThrow(/MEDIA_NOT_FOUND/);
 expect((await db.query('select status from public.media where id=$1',[id])).rows).toEqual([{status:'ready'}]);
});
it('does not allow public roles to invoke deletion functions',async()=>{
 await db.exec('set role anon');
 await expect(db.query('select public.begin_media_delete($1,$2,null)',[owner,id])).rejects.toThrow(/permission denied/i);
});
it('retries an interrupted grouped deletion without leaving a public snapshot',async()=>{
 const p=(await db.query<{photo:{id:string;revision:number}}>("select public.create_album_photo($1,$2,'','','') as photo",[owner,id])).rows[0].photo;
 await db.query("select public.update_album_photo($1,$2,1,'','','',true)",[p.id,owner]);
 await db.query('select public.begin_media_delete($1,$2,2)',[owner,id]);
 expect((await db.query('select id from public.published_album_photos')).rows).toEqual([]);
 expect((await db.query('select deletion_pending from public.admin_album_photo_inventory')).rows).toEqual([{deletion_pending:true}]);
 await expect(db.query('select public.begin_media_delete($1,$2,2)',[owner,id])).rejects.toThrow(/ALBUM_CONFLICT/);
 await db.query('select public.begin_media_delete($1,$2,3)',[owner,id]);
 await db.query('select public.finish_media_delete($1,$2)',[owner,id]);
 expect((await db.query('select id from public.admin_album_photo_inventory')).rows).toEqual([]);
});
it('denies public access to the combined private inventory',async()=>{
 await db.exec('set role anon');await expect(db.query('select * from public.admin_album_photo_inventory')).rejects.toThrow(/permission denied/i);
});
it('can repeat the incremental migrations without resetting existing media',async()=>{
 await db.exec('reset role');await db.query(await load('setup/query-album-media-view.sql'));await db.query(await load('setup/query-media-delete.sql'));
 expect((await db.query('select status from public.media where id=$1',[id])).rows).toEqual([{status:'ready'}]);
});
