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
  if (error.status === 0)
    throw new ServiceError(
      503,
      "MAIL_NETWORK_UNAVAILABLE",
      "网站未能连接邮件服务，发送结果尚未确认。请先查看邮箱，避免连续重复申请。",
    );
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
