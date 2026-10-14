"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { PublicAlbumPhoto } from "@/lib/album-types";
import type { PageInfo } from "@/lib/admin/queries";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/reading";

type PhotoPage = {photos:PublicAlbumPhoto[];pagination:PageInfo};
export function AlbumGallery({initial}: {initial:PhotoPage}) {
  const [photos,setPhotos]=useState(initial.photos);
  const [pagination,setPagination]=useState(initial.pagination);
  const [selected,setSelected]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [orderChanged,setOrderChanged]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const request=useRef<AbortController|null>(null);
  const busy=useRef(false);
  const photo=selected===null?null:photos[selected];
  const count=photos.length;
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{
    const current=dialog.current;
    if(!current)return;
    if(selected!==null&&!current.open)current.showModal();
    if(selected===null&&current.open)current.close();
  },[selected]);
  useEffect(()=>{
    if(selected===null)return;
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=original;};
  },[selected]);

  async function more() {
    if(busy.current)return;
    busy.current=true;setLoading(true);setError("");
    const controller=new AbortController();request.current=controller;
    try {
      const response=await fetch(`/api/album?page=${pagination.page+1}&pageSize=${pagination.pageSize}`,{cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error("照片暂时无法加载，请重试。");
      const next=await response.json() as PhotoPage;
      const ids=new Set(photos.map(item=>item.id));
      if(next.photos.some(item=>ids.has(item.id)))setOrderChanged(true);
      setPhotos(current=>{const known=new Set(current.map(item=>item.id));return [...current,...next.photos.filter(item=>!known.has(item.id))];});
      setPagination(next.pagination);
    } catch(cause) {
      if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"照片暂时无法加载，请重试。");
    } finally {busy.current=false;setLoading(false);}
  }
  const title=(item:PublicAlbumPhoto,index:number)=>item.caption||item.alt||`照片 ${index+1}`;
  const date=(item:PublicAlbumPhoto)=>item.date ? formatDate(item.date) : "日期未填写";
  return <>
    {photos.length===0?<p className="empty-state">相册还在等第一张照片。</p>:<div className="album-grid">
      {photos.map((item,index)=><figure key={item.id} className="album-print">
        <button type="button" className="album-photo-button" aria-label={`查看照片：${title(item,index)}`} onClick={()=>setSelected(index)}>
          <img src={mediaUrl(item.storageKey)} alt={item.alt||item.caption||"相册照片"} loading="lazy"/>
          <figcaption>{item.caption||item.alt||"小小留影"}<small>{date(item)}{item.demo?" · 示例照片":""}</small></figcaption>
        </button>
      </figure>)}
    </div>}
    {pagination.page*pagination.pageSize<pagination.total&&<div className="album-more">
      <button type="button" disabled={loading} onClick={()=>void more()}>{loading?"正在加载照片…":"加载更多照片"}</button>
      {error&&<p role="alert">{error}</p>}
    </div>}
    {orderChanged&&<p className="album-order-note">照片列表已更新。<a href="/album">刷新相册</a>可查看最新照片。</p>}
    <dialog ref={dialog} className="album-viewer" aria-labelledby="album-photo-title" onClose={()=>setSelected(null)} onCancel={()=>setSelected(null)}
      onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setSelected(null);}}}
      onKeyDown={event=>{if(event.key==="ArrowLeft"&&selected!==null&&selected>0){event.preventDefault();setSelected(selected-1);}if(event.key==="ArrowRight"&&selected!==null&&selected<count-1){event.preventDefault();setSelected(selected+1);}}}>
      {photo&&<>
        <header className="album-viewer-toolbar">
          <span aria-live="polite">{selected!+1} / {count}</span>
          <div>
            <button type="button" aria-label="上一张照片" disabled={selected===0} onClick={()=>setSelected(selected!-1)}><ArrowLeft size={18}/></button>
            <button type="button" aria-label="下一张照片" disabled={selected===count-1} onClick={()=>setSelected(selected!+1)}><ArrowRight size={18}/></button>
            <button type="button" aria-label="关闭大图" autoFocus onClick={()=>setSelected(null)}><X size={20}/></button>
          </div>
        </header>
        <figure className="album-viewer-photo">
          <img key={photo.id} src={mediaUrl(photo.storageKey)} alt={photo.alt||photo.caption||"相册照片"}/>
          <figcaption><p id="album-photo-title">{title(photo,selected!)}</p><time>{date(photo)}</time></figcaption>
        </figure>
      </>}
    </dialog>
  </>;
}
