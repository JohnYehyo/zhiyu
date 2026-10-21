import { revalidatePath } from "next/cache";
import { handleAdmin, readJson } from "@/lib/server/http";
import { setAlbumCollectionCover } from "@/lib/server/album-collection-repository";
import { validateAlbumCollectionCover } from "@/lib/server/album-collection-security";
import { validateId } from "@/lib/server/security";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const collection = await setAlbumCollectionCover(userId, id, validateAlbumCollectionCover(await readJson(request)));
    revalidatePath("/album");
    return { collection };
  });
}
