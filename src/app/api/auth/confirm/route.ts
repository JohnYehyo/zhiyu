import { hasWriteConfig } from "@/lib/config";
import { getServerSupabase } from "@/lib/supabase/server";
import { parseConfirmation } from "@/lib/auth/account";
import { readJson } from "@/lib/server/http";
import { assertOrigin, verifyAdminIdentity } from "@/lib/server/security";
import { ServiceError, unavailable } from "@/lib/server/errors";
import { confirmationError } from "@/lib/auth/confirmation-error";

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
    const result =
      "code" in input
        ? await client.auth.exchangeCodeForSession(input.code)
        : "tokenHash" in input
          ? await client.auth.verifyOtp({
              token_hash: input.tokenHash,
              type: input.type,
            })
          : await client.auth.setSession({
              access_token: input.accessToken,
              refresh_token: input.refreshToken,
            });
    if (result.error) throw confirmationError(result.error);
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
