import { ServiceError } from "../server/errors";

export function confirmationError(error: {
  name?: string;
  status?: number;
  code?: string;
}): ServiceError {
  if (error.name === "AuthPKCECodeVerifierMissingError")
    return new ServiceError(
      409,
      "VERIFIER_MISSING",
      "本站未收到申请邮件时保存的验证信息。请检查申请页与回跳页是否为同一域名，且浏览器未清除或拦截 Cookie；此链接不能单独完成验证。",
    );
  if (error.code === "bad_code_verifier")
    return new ServiceError(
      409,
      "VERIFIER_MISMATCH",
      "这封邮件与当前浏览器保存的验证信息不匹配。后一次申请可能覆盖了前一次，请只使用最后一次成功申请的邮件。",
    );
  if (
    [
      "flow_state_expired",
      "flow_state_not_found",
      "otp_expired",
      "invite_not_found",
    ].includes(error.code ?? "")
  )
    return new ServiceError(
      401,
      "LINK_EXPIRED",
      "邮件验证已过期或已使用，请申请新邮件，不要重复点击旧邮件。",
    );
  if (
    error.status === 0 ||
    (error.status === undefined && error.name === "AuthRetryableFetchError")
  )
    return new ServiceError(
      503,
      "AUTH_NETWORK_UNAVAILABLE",
      "网站未能连接账号验证服务。验证结果尚未确认，请勿重复点击邮件链接。",
    );
  if (error.status === 429)
    return new ServiceError(
      429,
      "AUTH_RATE_LIMIT",
      "账号验证请求过于频繁，请稍后再试。",
    );
  if ((error.status ?? 0) >= 500)
    return new ServiceError(
      503,
      "AUTH_UNAVAILABLE",
      "账号验证服务暂时不可用。请稍后再试，不要反复点击邮件链接。",
    );
  return new ServiceError(
    401,
    "LINK_INVALID",
    "邮件验证未完成。当前链接无法使用，请保留页面上的错误编号以便排查。",
  );
}
