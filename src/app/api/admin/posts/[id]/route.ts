import { handleAdmin, readJson } from "@/lib/server/http";
import { getDraft, mutateDraft } from "@/lib/server/repository";
import { validateId, validatePatch } from "@/lib/server/security";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
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
