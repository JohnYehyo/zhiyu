import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const state=vi.hoisted(()=>({filters:[] as unknown[],missing:false}));
vi.mock("@/lib/album",async()=>{
 class AlbumReadError extends Error {constructor(public code:string,message:string){super(message)}}
 return {AlbumReadError,albumQuery:(params:URLSearchParams)=>({page:1,pageSize:24,collectionId:params.get("collectionId")??undefined}),getAlbumCollections:async()=>{if(state.missing)throw new AlbumReadError("ALBUM_MIGRATION_REQUIRED","missing");return [{id:"11111111-1111-4111-8111-111111111111",title:"一次旅行",description:"旅途",photoCount:20,coverStorageKey:"/assets/meadow.svg"},{id:null,title:"未分组",description:"",photoCount:2,coverStorageKey:"/assets/flowers.svg"}]},getAlbumPage:async(options:unknown)=>{state.filters.push(options);return {photos:Array.from({length:20},(_,i)=>({id:`p${i}`,storageKey:"/assets/meadow.svg",caption:`旅行${i}`,alt:"",date:"",publishedAt:"2026-10-21T00:00:00Z"})),pagination:{page:1,pageSize:24,total:20}}}};
});
import Album from "./page";
beforeEach(()=>{state.filters=[];state.missing=false});
it("defaults to collection covers with a photo/album switch beside management",async()=>{
 const html=renderToStaticMarkup(await Album());
 expect(html).toContain("一次旅行");expect(html).toContain("20 张照片");expect(html).toContain("未分组");
 expect(html).toContain('href="/album?view=photos"');expect(html).toContain('href="/album?collection=11111111-1111-4111-8111-111111111111"');
 expect(html).toContain("管理相册");expect(html).not.toContain("查看照片：");
});
it("all photos view renders every returned public photo including the twentieth",async()=>{
 const html=renderToStaticMarkup(await Album({searchParams:Promise.resolve({view:"photos"})}));
 expect(html.match(/查看照片：/g)).toHaveLength(20);expect(html).toContain("旅行19");
});
it("collection detail retains its filter and provides return navigation",async()=>{
 const html=renderToStaticMarkup(await Album({searchParams:Promise.resolve({collection:"11111111-1111-4111-8111-111111111111"})}));
 expect(state.filters[0]).toMatchObject({collectionId:"11111111-1111-4111-8111-111111111111"});expect(html).toContain("所有相册");expect(html).toContain("一次旅行");
});
it("does not show a private or nonexistent album title",async()=>{
 const html=renderToStaticMarkup(await Album({searchParams:Promise.resolve({collection:"22222222-2222-4222-8222-222222222222"})}));
 expect(html).toContain("没有可展示的公开照片");expect(state.filters).toEqual([]);
});
