import Link from "next/link";
import { ArrowLeft, Folder, Images, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import { AlbumReadError, albumQuery, getAlbumCollections, getAlbumPage } from "@/lib/album";
import { AlbumGallery } from "@/components/album-gallery";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "小小相册" };
// Supabase SDK reads do not by themselves opt this page out of Next's full route cache.
export const dynamic = "force-dynamic";
type SearchParams = {view?:string|string[];collection?:string|string[]};
function AlbumHeading({ view, children }: {view:"albums"|"photos";children?:React.ReactNode}) {
  return <header className="page-heading">
    <span className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</span>
    <div className="page-heading-row"><h1>小小相册</h1><div className="album-heading-actions">
      <nav className="album-view-switch" aria-label="相册展示方式">
        <Link href="/album?view=photos" aria-current={view==="photos"?"page":undefined}><Images size={14}/>所有相片</Link>
        <Link href="/album" aria-current={view==="albums"?"page":undefined}><LayoutGrid size={14}/>相册</Link>
      </nav>
      <Link className="text-link page-manage-link" href="/admin/album" prefetch={false}><Images size={14}/>管理相册</Link>
    </div></div>
    <p>一张照片，留住一个小小的瞬间。</p>
    {children}
  </header>;
}
async function loadAlbum(view:"albums"|"photos",collection?:string) {
  try {
    if(view==="photos")return {kind:"photos",result:await getAlbumPage()} as const;
    const collections=await getAlbumCollections();
    if(!collection)return {kind:"albums",collections} as const;
    const chosen=collections.find(item=>(item.id??"unassigned")===collection);
    if(!chosen)return {kind:"not-found"} as const;
    const result=await getAlbumPage(albumQuery(new URLSearchParams({collectionId:collection})));
    return {kind:"collection",chosen,result} as const;
  } catch(error){
    if(!(error instanceof AlbumReadError)||error.code!=="ALBUM_MIGRATION_REQUIRED")throw error;
    return {kind:"preparing"} as const;
  }
}
export default async function Album({searchParams}: {searchParams?:Promise<SearchParams>}={}) {
  const params=await searchParams??{};
  const view=params.view==="photos"?"photos":"albums";
  const collection=typeof params.collection==="string"?params.collection.toLowerCase():undefined;
  const data=await loadAlbum(view,collection);
  if(data.kind==="preparing")return <main id="main"><AlbumHeading view={view}/><p className="empty-state">相册正在准备中，稍后再来看看。</p></main>;
  if(data.kind==="photos")return <main id="main"><AlbumHeading view="photos"/>
    <p className="album-count">共 {data.result.pagination.total} 张照片</p>
    {data.result.photos.some(photo=>photo.demo)&&<p className="demo-notice">这些是相册示例照片。连接后台后，只展示你选择公开的照片。</p>}
    <AlbumGallery key="all" initial={data.result}/>
  </main>;
  if(data.kind==="not-found")return <main id="main"><AlbumHeading view="albums"/><p className="empty-state">这个相册没有可展示的公开照片。</p><Link className="text-link" href="/album">返回所有相册</Link></main>;
  if(data.kind==="collection")return <main id="main"><AlbumHeading view="albums"/>
    <section className="album-collection-heading"><Link className="text-link" href="/album"><ArrowLeft size={14}/>所有相册</Link>
      <h2>{data.chosen.title}</h2>{data.chosen.description&&<p>{data.chosen.description}</p>}<span className="album-count">共 {data.result.pagination.total} 张照片</span>
    </section><AlbumGallery key={collection} initial={data.result} collectionId={collection}/>
  </main>;
  return <main id="main"><AlbumHeading view="albums"/>
    {data.collections.length===0?<p className="empty-state">相册还在等第一张照片。公开照片后，就能在这里看到了。</p>:<div className="album-collections">
      {data.collections.map(item=><Link key={item.id??"unassigned"} className="album-collection" href={`/album?collection=${item.id??"unassigned"}`}>
        <div className="album-collection-cover">{item.coverStorageKey?<img src={mediaUrl(item.coverStorageKey)} alt="" loading="lazy"/>:<Folder size={32}/>}</div>
        <div className="album-collection-caption"><h2><Folder size={16}/>{item.title}</h2><span>{item.photoCount} 张照片</span></div>
        {item.description&&<p>{item.description}</p>}
      </Link>)}
    </div>}
  </main>;
}
