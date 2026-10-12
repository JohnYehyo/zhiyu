import { handleAdmin } from "@/lib/server/http";
import { uploadRepository } from "@/lib/server/repository";
import { r2Storage } from "@/lib/server/r2";
import { validateId } from "@/lib/server/security";
import { completeUpload } from "@/lib/server/upload-service";
import { mediaUrl } from "@/lib/media";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAdmin(request, async ({ userId }) => {
    const media = await completeUpload(
      userId,
      validateId((await context.params).id),
      uploadRepository(),
      r2Storage(),
    );
    return { media, url: mediaUrl(media.storageKey) };
  });
}
