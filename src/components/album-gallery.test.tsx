import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AlbumGallery } from "./album-gallery";
it("renders independent photos as view-image buttons without linking to diary pages",()=>{
 const html=renderToStaticMarkup(<AlbumGallery initial={{photos:[{id:"photo1",storageKey:"/assets/meadow.svg",alt:"a meadow",caption:"<script>caption</script>",date:"2026-10-14",publishedAt:"2026-10-14T00:00:00Z"}],pagination:{page:1,pageSize:24,total:1}}}/>);
 expect(html).toContain("查看照片：");expect(html).toContain("a meadow");expect(html).toContain("&lt;script&gt;caption&lt;/script&gt;");expect(html).not.toContain("/posts/");expect(html).not.toContain("<script>caption");expect(html).not.toContain("加载更多照片");
});
it("empty gallery has a photo-specific empty state rather than diary cards",()=>{
 expect(renderToStaticMarkup(<AlbumGallery initial={{photos:[],pagination:{page:1,pageSize:24,total:0}}}/>)).toContain("相册还在等第一张照片");
});
it("stops at the server's last page even when live reordering produced a duplicate",()=>{
 const photos=Array.from({length:24},(_,index)=>({id:`photo-${index}`,storageKey:"/assets/meadow.svg",alt:"photo",caption:"",date:"",publishedAt:"2026-10-14T00:00:00Z"}));
 // A newly reordered image moved onto page1; page2 repeats a loaded item.
 const html=renderToStaticMarkup(<AlbumGallery initial={{photos,pagination:{page:2,pageSize:24,total:25}}}/>);
 expect(html).not.toContain("加载更多照片");
});
