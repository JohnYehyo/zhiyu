import { revalidatePath } from "next/cache";
import { handleAdmin, readJson } from "@/lib/server/http";
import { mutateDraft } from "@/lib/server/repository";
import { validateId, validateRevision } from "@/lib/server/security";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAdmin(request, async ({ userId }) => {
    const id = validateId((await context.params).id);
    const post = await mutateDraft(
      "unpublish_post",
      userId,
      id,
      validateRevision(await readJson(request)),
    );
    revalidatePath("/", "layout");
    return { post };
  });
}
