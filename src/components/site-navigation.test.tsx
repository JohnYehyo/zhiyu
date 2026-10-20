import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("next/navigation",()=>({usePathname:()=>"/archive",useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/posts",()=>({getPublishedPosts:async()=>[]}));
const album = vi.hoisted(()=>({missing:false}));
vi.mock("@/lib/album",()=>({AlbumReadError:class extends Error {constructor(public code:string,message:string){super(message)}},getAlbumCollections:async()=>{if(album.missing){const {AlbumReadError}=await import("@/lib/album");throw new AlbumReadError("ALBUM_MIGRATION_REQUIRED","missing");}return [];},getAlbumPage:async()=>{if(album.missing){const {AlbumReadError}=await import("@/lib/album");throw new AlbumReadError("ALBUM_MIGRATION_REQUIRED","missing");}return {photos:[],pagination:{page:1,pageSize:24,total:0}};}}));
vi.mock("./admin/guard",()=>({AdminGuard:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock("./admin/post-list",()=>({PostList:()=> <div>article-list</div>}));
vi.mock("./admin/album-manager",()=>({AlbumManager:()=> <div>album-manager</div>}));
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import Home from "@/app/page";
import Archive from "@/app/archive/page";
import Album from "@/app/album/page";
import ArticlesAdmin from "@/app/admin/page";
import AlbumAdmin from "@/app/admin/album/page";
const managementLinks=(html:string)=>Array.from(html.matchAll(/href="(\/admin[^\"]*)"/g),m=>m[1]);
it("navigation has exactly the four distinct destinations",()=>{
 const html=renderToStaticMarkup(<SiteHeader/>);
 const nav=html.match(/<nav class="site-nav".*?<\/nav>/)?.[0]??"";
 expect(Array.from(nav.matchAll(/href="([^"]+)"/g),m=>m[1])).toEqual(["/","/album","/archive","/about"]);
 for(const label of ["首页","相册","记录","关于"])expect(nav).toContain(label);
 expect(nav).not.toMatch(/写给你|归档|>日记</);
 expect(nav.match(/<a[^>]+href="\/archive"[^>]*>/)?.[0]).toContain('aria-current="page"');
});
it("home has only the write shortcut and the global footer has no generic management entry",async()=>{
 expect(managementLinks(renderToStaticMarkup(await Home()))).toEqual(["/admin/posts/new"]);
 expect(managementLinks(renderToStaticMarkup(<SiteFooter/>))).toEqual([]);
});
it("records page owns article management",async()=>{
 const html=renderToStaticMarkup(await Archive());
 expect(html).toContain(">记录</h1>");expect(html).toContain("管理文章");
 expect(managementLinks(html)).toEqual(["/admin"]);
});
it.each([false,true])("album owns only album management even when missing schema is %s",async missing=>{
 album.missing=missing;
 try{const html=renderToStaticMarkup(await Album());expect(html).toContain("管理相册");expect(managementLinks(html)).toEqual(["/admin/album"]);}finally{album.missing=false;}
});
it("admin sections have separate content and return to their own public section",()=>{
 const articles=renderToStaticMarkup(<ArticlesAdmin/>),photos=renderToStaticMarkup(<AlbumAdmin/>);
 expect(articles).toContain("文章管理");expect(articles).toContain('href="/archive"');expect(articles).toContain("返回记录");expect(articles).not.toContain("/admin/album");expect(articles).not.toContain("album-manager");
 expect(photos).toContain("相册管理");expect(photos).toContain('href="/album"');expect(photos).toContain("返回相册");expect(photos).not.toContain('href="/admin"');expect(photos).not.toContain("article-list");
});
