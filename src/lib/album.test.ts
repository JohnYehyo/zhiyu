import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const call = vi.hoisted(() => ({ error: null as null | {code:string}, rows: [] as Record<string,unknown>[], table:"", select:"", range:[] as number[] }));
vi.mock("./config", () => ({ hasSupabaseConfig:()=>true, publicSupabaseUrl:()=>"https://synthetic.supabase.co",publicSupabaseKey:()=>"synthetic-public" }));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({from:(table:string)=>{
 call.table=table;
 const query={select:(s:string)=>{call.select=s;return query},order:()=>query,range:(a:number,b:number)=>{call.range=[a,b];return Promise.resolve({data:call.rows,count:call.rows.length,error:call.error})}};
 return query;
}})}));
import { getAlbumPage, albumQuery } from "./album";
afterEach(()=>{call.error=null;call.rows=[];vi.unstubAllEnvs()});
it("uses independent published photo snapshots and only public columns",async()=>{
 call.rows=[{id:"11111111-1111-4111-8111-111111111111",storage_key:"blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",caption:"a photo",alt:"child",taken_on:"2026-10-14",published_at:"2026-10-14T00:00:00Z",owner_id:"private",media_id:"private"}];
 const result=await getAlbumPage({page:2,pageSize:24});
 expect(call.table).toBe("published_album_photos");
 expect(call.select).toBe("id,storage_key,caption,alt,taken_on,published_at");
 expect(call.range).toEqual([24,47]);
 expect(result.photos[0]).toEqual({id:call.rows[0].id,storageKey:call.rows[0].storage_key,caption:"a photo",alt:"child",date:"2026-10-14",publishedAt:"2026-10-14T00:00:00Z"});
 expect(result.pagination).toEqual({page:2,pageSize:24,total:1});
});
it("distinguishes missing album schema from empty album and network failure",async()=>{
 call.error={code:"PGRST205"};await expect(getAlbumPage()).rejects.toMatchObject({code:"ALBUM_MIGRATION_REQUIRED"});
 call.error={code:"other"};await expect(getAlbumPage()).rejects.toThrow("相册暂时无法读取");
 call.error=null;expect((await getAlbumPage()).photos).toEqual([]);
});
it("public gallery pagination rejects extra and repeated fields and invalid bounds",()=>{
 expect(albumQuery(new URLSearchParams("page=2&pageSize=24"))).toEqual({page:2,pageSize:24});
 for(const query of ["page=0","page=-1","page=10001","pageSize=101","page=1&page=2","owner_id=other","status=private"])
 expect(()=>albumQuery(new URLSearchParams(query))).toThrow();
});
