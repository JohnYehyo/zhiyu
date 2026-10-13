import { handleAuth } from "@/lib/server/auth-http";
import { readJson } from "@/lib/server/http";
import { parseLogin } from "@/lib/auth/credentials";
import { getServerSupabase } from "@/lib/supabase/server";
import { verifyAdminIdentity } from "@/lib/server/security";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAuth(request, async () => {
    const input = parseLogin(await readJson(request));
    const client = await getServerSupabase();
    const { error } = await client.auth.signInWithPassword(input);
    if (error) {
      if (error.status === 0)
        throw new ServiceError(
          503,
          "AUTH_NETWORK_UNAVAILABLE",
          "网站未能连接账号服务，请稍后重试。",
        );
      if (error.status === 429)
        throw new ServiceError(
          429,
          "AUTH_RATE_LIMIT",
          "登录尝试过于频繁，请稍后再试。",
        );
      if (
        error.code === "invalid_credentials" ||
        error.code === "email_not_confirmed"
      )
        throw new ServiceError(
          401,
          "LOGIN_FAILED",
          "邮箱或密码不正确，或账号邮箱尚未确认。",
        );
      throw new ServiceError(
        503,
        "AUTH_UNAVAILABLE",
        "登录服务暂时不可用，请稍后重试。",
      );
    }
    try {
      const { data, error: verificationError } = await client.auth.getUser();
      if (verificationError)
        throw new ServiceError(
          503,
          "AUTH_UNAVAILABLE",
          "登录验证暂时不可用，请稍后重试。",
        );
      verifyAdminIdentity(data.user, process.env.ADMIN_USER_ID);
    } catch (cause) {
      await client.auth.signOut({ scope: "local" });
      throw cause;
    }
    return { redirectTo: "/admin" };
  });
}
