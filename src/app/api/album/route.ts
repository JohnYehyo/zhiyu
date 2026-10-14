import { AlbumReadError, albumQuery, getAlbumPage } from "@/lib/album";
export async function GET(request: Request) {
  try {
    return Response.json(await getAlbumPage(albumQuery(new URL(request.url).searchParams)),{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    const invalid=error instanceof AlbumReadError&&error.code==="INVALID_QUERY";
    return Response.json({error:error instanceof AlbumReadError?error.message:"相册暂时无法读取，请稍后重试。",code:error instanceof AlbumReadError?error.code:"ALBUM_UNAVAILABLE"},{status:invalid?400:503,headers:{"Cache-Control":"no-store"}});
  }
}
