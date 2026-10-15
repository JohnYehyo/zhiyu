import Link from "next/link";
import { Images } from "lucide-react";
import type { Metadata } from "next";
import { AlbumReadError, getAlbumPage } from "@/lib/album";
import { AlbumGallery } from "@/components/album-gallery";

export const metadata: Metadata = { title: "小小相册" };
function AlbumHeading({ children }: { children?: React.ReactNode }) {
  return <header className="page-heading">
    <span className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</span>
    <div className="page-heading-row"><h1>小小相册</h1><Link className="text-link page-manage-link" href="/admin/album" prefetch={false}><Images size={14} />管理相册</Link></div>
    <p>一张照片，留住一个小小的瞬间。</p>
    {children}
  </header>;
}
export default async function Album() {
  let result;
  try {result=await getAlbumPage();}
  catch(error){
    if(!(error instanceof AlbumReadError)||error.code!=="ALBUM_MIGRATION_REQUIRED")throw error;
    return <main id="main"><AlbumHeading/><p className="empty-state">相册正在准备中，稍后再来看看。</p></main>;
  }
  return <main id="main">
    <AlbumHeading>
      {result.photos.some(photo=>photo.demo)&&<p className="demo-notice">这些是相册示例照片。连接后台后，只展示你选择公开的照片。</p>}
    </AlbumHeading>
    <AlbumGallery initial={result}/>
  </main>;
}
