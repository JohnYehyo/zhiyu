import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "../server/errors";

export async function requestPasswordRecovery(
  auth: Pick<SupabaseClient["auth"], "resetPasswordForEmail">,
  email: string,
  redirectTo: string,
): Promise<void> {
  const { error } = await auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (!error) return;
  if (
    error.status === 429 ||
    ["over_email_send_rate_limit", "over_request_rate_limit"].includes(
      error.code ?? "",
    )
  )
    throw new ServiceError(
      429,
      "MAIL_RATE_LIMIT",
      "邮件服务已限制发送频率，请稍后再试。连续点击不会生成新邮件。",
    );
  throw new ServiceError(
    503,
    "MAIL_UNAVAILABLE",
    "邮件暂时无法发送，请稍后重试；也请检查账号邮件服务是否可用。",
  );
}
