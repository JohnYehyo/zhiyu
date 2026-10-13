import { hasWriteConfig } from "@/lib/config";
import { getServerSupabase } from "@/lib/supabase/server";
import { parseConfirmation } from "@/lib/auth/account";
import { readJson } from "@/lib/server/http";
import { assertOrigin, verifyAdminIdentity } from "@/lib/server/security";
import { ServiceError, unavailable } from "@/lib/server/errors";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (!hasWriteConfig()) unavailable();
    const input = parseConfirmation(await readJson(request));
    const client = await getServerSupabase();
    const result = await client.auth.verifyOtp({
      token_hash: input.tokenHash,
      type: input.type,
    });
    if (result.error)
      throw new ServiceError(
        401,
        "LINK_INVALID",
        "邮件链接无效、已使用或已过期，请申请一封新邮件。",
      );
    const { data, error } = await client.auth.getUser();
    try {
      verifyAdminIdentity(error ? null : data.user, process.env.ADMIN_USER_ID);
    } catch (cause) {
      await client.auth.signOut({ scope: "local" });
      throw cause;
    }
    return Response.json({ redirectTo: "/admin/password" }, { headers });
  } catch (cause) {
    const failure =
      cause instanceof ServiceError
        ? cause
        : new ServiceError(
            503,
            "AUTH_UNAVAILABLE",
            "账号验证暂不可用，请稍后重试。",
          );
    return Response.json(
      { error: failure.message, code: failure.code },
      { status: failure.status, headers },
    );
  }
}
