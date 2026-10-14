import type { Metadata } from "next";
import { AlbumReadError, getAlbumPage } from "@/lib/album";
import { AlbumGallery } from "@/components/album-gallery";

export const metadata: Metadata = { title: "小小相册" };
export default async function Album() {
  let result;
  try {result=await getAlbumPage();}
  catch(error){
    if(!(error instanceof AlbumReadError)||error.code!=="ALBUM_MIGRATION_REQUIRED")throw error;
    return <main id="main"><header className="page-heading"><span className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</span><h1>小小相册</h1><p>收藏生活里的小小留影。</p></header><p className="empty-state">相册正在准备中，稍后再来看看。</p></main>;
  }
  return <main id="main">
    <header className="page-heading"><span className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</span><h1>小小相册</h1><p>一张照片，留住一个小小的瞬间。</p>
      {result.photos.some(photo=>photo.demo)&&<p className="demo-notice">这些是相册示例照片。连接后台后，只展示你选择公开的照片。</p>}
    </header>
    <AlbumGallery initial={result}/>
  </main>;
}
