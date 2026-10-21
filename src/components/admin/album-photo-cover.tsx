import { Image as ImageIcon } from "lucide-react";
import type { AlbumCollection, AlbumPhoto } from "@/lib/album-types";

export function AlbumPhotoCover({photo,collection,busy,dirty,collectionEditing=false,onChoose}:{
  photo:AlbumPhoto; collection?:AlbumCollection; busy:boolean; dirty:boolean; collectionEditing?:boolean; onChoose():void;
}) {
  if(!collection || collection.id!==photo.collectionId)
    return <p className="admin-hint">归入相册集并公开后，可将这张照片设为相册封面。</p>;
  if(!photo.published)return <p className="admin-hint">公开这张照片后，可设为相册封面。</p>;
  const current=collection.coverPhotoId===photo.id;
  return <div className="admin-album-cover-control">
    <button type="button" className="admin-button subtle" disabled={busy||dirty||collectionEditing||current} onClick={onChoose}>
      <ImageIcon size={14}/>{current?"当前相册封面":"设为相册封面"}
    </button>
    {collectionEditing&&<p className="admin-hint">请先完成或关闭相册集编辑，再设置封面。</p>}
    {dirty&&<p className="admin-hint">请先保存照片修改，再设置封面。</p>}
  </div>;
}
