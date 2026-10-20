import { revalidatePath } from "next/cache";
import { handleAdmin, readJson } from "@/lib/server/http";
import { updateAlbumCollection, removeAlbumCollection } from "@/lib/server/album-collection-repository";
import { validateAlbumCollectionPatch, parseCollectionDeleteQuery } from "@/lib/server/album-collection-security";
import { validateId } from "@/lib/server/security";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const collection = await updateAlbumCollection(userId, id, validateAlbumCollectionPatch(await readJson(request)));
    revalidatePath("/album");
    return { collection };
  });
}
export async function DELETE(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const deletedId = await removeAlbumCollection(userId, id, parseCollectionDeleteQuery(new URL(request.url).searchParams));
    revalidatePath("/album");
    return { deletedId };
  });
}
