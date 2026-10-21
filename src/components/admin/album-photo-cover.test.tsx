import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlbumPhotoCover } from "./album-photo-cover";
import type { AlbumCollection, AlbumPhoto } from "@/lib/album-types";
const collection:AlbumCollection={id:"trip",title:"旅行",description:"",revision:1,photoCount:3,createdAt:"",updatedAt:"",coverPhotoId:null};
const photo:AlbumPhoto={id:"photo",mediaId:"media",collectionId:"trip",storageKey:"/assets/meadow.svg",caption:"",alt:"",date:"",revision:1,published:true,createdAt:"",updatedAt:""};
const render=(overrides:Partial<Parameters<typeof AlbumPhotoCover>[0]>={})=>renderToStaticMarkup(<AlbumPhotoCover photo={photo} collection={collection} busy={false} dirty={false} onChoose={()=>{}} {...overrides}/>);
it("allows choosing a published member while an automatic cover is in use",()=>{
 const html=render();expect(html).toContain("设为相册封面");expect(html).not.toContain('disabled=""');expect(html).toContain('type="button"');
});
it("does not let private or ungrouped photos become a public cover",()=>{
 expect(render({photo:{...photo,published:false}})).not.toContain("<button");
 expect(render({collection:undefined,photo:{...photo,collectionId:null}})).not.toContain("<button");
 expect(render({collection:{...collection,id:"different"}})).not.toContain("<button");
});
it("marks the selected cover and blocks repeat selection or unsaved photo metadata",()=>{
 const current=render({collection:{...collection,coverPhotoId:"photo"}});expect(current).toContain("当前相册封面");expect(current).toContain('disabled=""');
 const dirty=render({dirty:true});expect(dirty).toContain('disabled=""');expect(dirty).toContain("先保存");
 expect(render({busy:true})).toContain('disabled=""');
});
it("blocks cover mutations throughout collection editing even before its fields become dirty",()=>{
 const html=render({collectionEditing:true});expect(html).toContain('disabled=""');expect(html).toContain("相册集编辑");
});
