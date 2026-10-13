import { getServerSupabase } from "@/lib/supabase/server";
import { parsePassword } from "@/lib/auth/account";
import { handleAdmin, readJson } from "@/lib/server/http";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, async () => {
    const password = parsePassword(await readJson(request));
    const client = await getServerSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error)
      throw new ServiceError(
        400,
        "PASSWORD_UPDATE_FAILED",
        "密码设置失败：请检查项目密码要求，或重新申请邮件恢复会话。",
      );
    return { updated: true };
  });
}
