import { revalidatePath } from "next/cache";
import { handleAdmin, readJson } from "@/lib/server/http";
import { updateAlbumPhoto, removeAlbumPhoto } from "@/lib/server/album-repository";
import { validateAlbumPatch } from "@/lib/server/album-security";
import { validateId, validateRevision } from "@/lib/server/security";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const draft = validateAlbumPatch(await readJson(request));
    const photo = await updateAlbumPhoto(userId, id, draft);
    // Withdrawal also changes the public gallery even when the new row is private.
    revalidatePath("/album");
    return { photo };
  });
}
export async function DELETE(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const revision = validateRevision(await readJson(request));
    const deletedId = await removeAlbumPhoto(userId, id, revision);
    revalidatePath("/album");
    return { deletedId };
  });
}
