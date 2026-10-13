import { handleAdmin, readJson } from "@/lib/server/http";
import { getDraft, mutateDraft, deleteDraft } from "@/lib/server/repository";
import {
  validateId,
  validatePatch,
  validateRevision,
} from "@/lib/server/security";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function DELETE(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const revision = validateRevision(await readJson(request));
    const deletedId = await deleteDraft(userId, id, revision);
    revalidatePath("/", "layout");
    return { deletedId };
  });
}
export async function GET(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => ({
    post: await getDraft(userId, validateId((await context.params).id)),
  }));
}
export async function PATCH(request: Request, context: Context) {
  return handleAdmin(request, async ({ userId }) => {
    const { revision, draft } = validatePatch(await readJson(request));
    return {
      post: await mutateDraft(
        "save_draft",
        userId,
        validateId((await context.params).id),
        revision,
        draft,
      ),
    };
  });
}
