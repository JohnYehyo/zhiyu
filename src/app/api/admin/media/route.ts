import { handleAdmin, readJson } from "@/lib/server/http";
import { uploadRepository, listMediaPage } from "@/lib/server/repository";
import { parseMediaQuery } from "@/lib/admin/queries";
import { r2Storage } from "@/lib/server/r2";
import { validateUpload } from "@/lib/server/security";
import { createUpload } from "@/lib/server/upload-service";
import { adminSiteRedirect } from "@/lib/auth/site";
import { ServiceError } from "@/lib/server/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) =>
    listMediaPage(userId, parseMediaQuery(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) => {
    const target = adminSiteRedirect(new URL(request.url).host, "/admin");
    if (target)
      throw new ServiceError(
        409,
        "USE_CANONICAL_SITE",
        `请从固定正式网站 ${target} 登录并上传。当前部署地址不在存储跨域允许列表中。`,
      );
    return createUpload(
      userId,
      validateUpload(await readJson(request)),
      uploadRepository(),
      r2Storage(),
    );
  });
}
