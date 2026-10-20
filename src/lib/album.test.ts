import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const call = vi.hoisted(() => ({ error: null as null | {code:string}, rows: [] as Record<string,unknown>[], table:"", select:"", range:[] as number[], ranges:[] as number[][], filter:[] as unknown[], count:0 }));
vi.mock("./config", () => ({ hasSupabaseConfig:()=>true, publicSupabaseUrl:()=>"https://synthetic.supabase.co",publicSupabaseKey:()=>"synthetic-public" }));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({from:(table:string)=>{
 call.table=table;
 const query={select:(s:string)=>{call.select=s;return query},order:()=>query,eq:(...args:unknown[])=>{call.filter=["eq",...args];return query},is:(...args:unknown[])=>{call.filter=["is",...args];return query},range:(a:number,b:number)=>{call.range=[a,b];call.ranges.push([a,b]);if(table==="published_album_collections"&&a>=call.rows.length&&a>0)return Promise.resolve({data:null,count:call.count,error:{code:"PGRST103"}});return Promise.resolve({data:call.rows,count:call.count,error:call.error})}};
 return query;
}})}));
import { getAlbumPage, albumQuery, getAlbumCollections } from "./album";
afterEach(()=>{call.error=null;call.rows=[];call.filter=[];call.count=0;call.ranges=[];vi.unstubAllEnvs()});
it("uses independent public snapshots and only public columns",async()=>{
 call.rows=[{id:"11111111-1111-4111-8111-111111111111",storage_key:"blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",caption:"a photo",alt:"child",taken_on:"2026-10-14",published_at:"2026-10-14T00:00:00Z",collection_id:null,owner_id:"private",media_id:"private"}];call.count=1;
 const result=await getAlbumPage({page:2,pageSize:24});
 expect(call.table).toBe("published_album_photos");
 expect(call.select).toBe("id,storage_key,caption,alt,taken_on,published_at,collection_id");
 expect(call.range).toEqual([24,47]);
 expect(result.photos[0]).toEqual({id:call.rows[0].id,storageKey:call.rows[0].storage_key,caption:"a photo",alt:"child",date:"2026-10-14",publishedAt:"2026-10-14T00:00:00Z",collectionId:null});
 expect(result.pagination).toEqual({page:2,pageSize:24,total:1});
});
it("filters a chosen collection or ungrouped photos without selecting private data",async()=>{
 await getAlbumPage({page:1,pageSize:24,collectionId:"11111111-1111-4111-8111-111111111111"});
 expect(call.filter).toEqual(["eq","collection_id","11111111-1111-4111-8111-111111111111"]);
 await getAlbumPage({page:1,pageSize:24,collectionId:"unassigned"});expect(call.filter).toEqual(["is","collection_id",null]);
});
it("lists collections solely from published snapshots",async()=>{
 call.rows=[{collection_id:null,title:"未分组",description:"",photo_count:20,cover_storage_key:"/assets/meadow.svg",owner_id:"private"}];
 expect(await getAlbumCollections()).toEqual([{id:null,title:"未分组",description:"",photoCount:20,coverStorageKey:"/assets/meadow.svg"}]);
 expect(call.table).toBe("published_album_collections");
});
it("distinguishes missing schema from an empty gallery and network failure",async()=>{
 call.error={code:"PGRST205"};await expect(getAlbumPage()).rejects.toMatchObject({code:"ALBUM_MIGRATION_REQUIRED"});
 call.error={code:"other"};await expect(getAlbumPage()).rejects.toThrow("相册暂时无法读取");
 call.error=null;expect((await getAlbumPage()).photos).toEqual([]);
});
it("public pagination accepts only one well-formed collection filter",()=>{
 expect(albumQuery(new URLSearchParams("page=2&pageSize=24"))).toEqual({page:2,pageSize:24});
 expect(albumQuery(new URLSearchParams("collectionId=unassigned"))).toEqual({page:1,pageSize:24,collectionId:"unassigned"});
 for(const query of ["page=0","page=-1","page=10001","pageSize=101","page=1&page=2","owner_id=other","status=private","collectionId=garbage","collectionId=unassigned&collectionId=unassigned"])
 expect(()=>albumQuery(new URLSearchParams(query))).toThrow();
});

it("does not request an invalid range after an exact full page of collections",async()=>{
 call.rows=Array.from({length:1000},(_,i)=>({collection_id:String(i),title:"trip",description:"",photo_count:1,cover_storage_key:"/assets/meadow.svg"}));call.count=1000;
 const collections=await getAlbumCollections();
 expect(collections).toHaveLength(1000);expect(call.ranges).toEqual([[0,999]]);
});
