import { handleAdmin, readJson } from "@/lib/server/http";
import { createAlbumCollection, listAlbumCollections } from "@/lib/server/album-collection-repository";
import { validateAlbumCollectionCreate } from "@/lib/server/album-collection-security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({ collections: await listAlbumCollections(userId) }));
}
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({ collection: await createAlbumCollection(userId, validateAlbumCollectionCreate(await readJson(request))) }));
}
