import { handleAdmin, readJson } from "@/lib/server/http";
import { createAlbumPhoto, listAlbumPage } from "@/lib/server/album-repository";
import { parseAlbumQuery, validateAlbumCreate } from "@/lib/server/album-security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) =>
    listAlbumPage(userId, parseAlbumQuery(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({
    photo: await createAlbumPhoto(userId, validateAlbumCreate(await readJson(request))),
  }));
}
