import { handleAdmin, readJson } from "@/lib/server/http";
import { uploadRepository } from "@/lib/server/repository";
import { r2Storage } from "@/lib/server/r2";
import { validateUpload } from "@/lib/server/security";
import { createUpload } from "@/lib/server/upload-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) =>
    createUpload(
      userId,
      validateUpload(await readJson(request)),
      uploadRepository(),
      r2Storage(),
    ),
  );
}
