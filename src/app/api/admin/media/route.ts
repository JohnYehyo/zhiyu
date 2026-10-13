import { handleAdmin, readJson } from "@/lib/server/http";
import { uploadRepository, listMediaPage } from "@/lib/server/repository";
import { parseMediaQuery } from "@/lib/admin/queries";
import { r2Storage } from "@/lib/server/r2";
import { validateUpload } from "@/lib/server/security";
import { createUpload } from "@/lib/server/upload-service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) =>
    listMediaPage(userId, parseMediaQuery(new URL(request.url).searchParams)),
  );
}
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
