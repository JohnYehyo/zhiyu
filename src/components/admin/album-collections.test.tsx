import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlbumCollections } from "./album-collections";

it("offers all, unassigned and collection filters and keeps management controls contextual", () => {
  const props = { collections: [{ id: "collection-a", title: "出游 <春天>", description: "山间的周末", revision: 2, photoCount: 3, createdAt: "", updatedAt: "" }], value: "all", disabled: false, onChange() {}, beforeChange: () => true, onSaved() {}, onDeleted() {}, onDirtyChange() {}, onBusyChange() {} };
  const all = renderToStaticMarkup(<AlbumCollections {...props} />);
  expect(all).toContain("所有相片"); expect(all).toContain("未分组");
  expect(all).toContain("出游 &lt;春天&gt;（3）");
  expect(all).not.toContain("删除相册集");
  const selected = renderToStaticMarkup(<AlbumCollections {...props} value="collection-a" />);
  expect(selected).toContain("山间的周末");
  expect(selected).toContain("编辑相册集"); expect(selected).toContain("删除相册集");
});

it("offers restoring automatic cover only for a collection with a manual cover",()=>{
 const props={collections:[{id:"trip",title:"旅行",description:"",revision:2,photoCount:3,createdAt:"",updatedAt:"",coverPhotoId:"photo"}],value:"trip",disabled:false,onChange(){},beforeChange:()=>true,onSaved(){},onDeleted(){},onDirtyChange(){},onBusyChange(){},onResetCover(){}};
 expect(renderToStaticMarkup(<AlbumCollections {...props}/>)).toContain("恢复自动封面");
 expect(renderToStaticMarkup(<AlbumCollections {...props} collections={[{...props.collections[0],coverPhotoId:null}]}/>)).not.toContain("恢复自动封面");
});
