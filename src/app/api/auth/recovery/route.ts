import { handleAuth } from "@/lib/server/auth-http";
import { readJson } from "@/lib/server/http";
import { parseRecovery } from "@/lib/auth/credentials";
import { requestPasswordRecovery } from "@/lib/auth/recovery";
import { getServerSupabase } from "@/lib/supabase/server";
import { recoverySiteRedirect } from "@/lib/auth/site";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAuth(request, async () => {
    if (recoverySiteRedirect(new URL(request.url).host))
      throw new ServiceError(
        409,
        "USE_CANONICAL_SITE",
        "请从固定正式网站申请密码邮件，避免回跳时缺少验证信息。",
      );
    const { email } = parseRecovery(await readJson(request));
    const client = await getServerSupabase();
    await requestPasswordRecovery(
      client.auth,
      email,
      `${new URL(request.url).origin}/auth/confirm`,
    );
    return { accepted: true };
  });
}
