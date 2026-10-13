import { z } from "zod";
import { ServiceError } from "../server/errors";
export type ConfirmationType = "invite" | "recovery";
const hashConfirmation = z
  .object({
    tokenHash: z
      .string()
      .min(16)
      .max(256)
      .regex(/^[a-zA-Z0-9_-]+$/),
    type: z.enum(["invite", "recovery"]),
  })
  .strict();
const confirmation = z.union([
  hashConfirmation,
  z
    .object({
      code: z
        .string()
        .min(1)
        .max(1024)
        .regex(/^[a-zA-Z0-9_-]+$/),
    })
    .strict(),
  z
    .object({
      accessToken: z.string().min(1).max(8192),
      refreshToken: z.string().min(1).max(8192),
    })
    .strict(),
]);
export type ConfirmationInput = z.infer<typeof confirmation>;
export type EmailCallback =
  { input: ConfirmationInput } | { error: "expired" | "invalid" } | null;
const password = z
  .object({
    password: z.string().min(8).max(128),
    confirmation: z.string().min(8).max(128),
  })
  .strict()
  .refine((value) => value.password === value.confirmation);
export function parseConfirmation(input: unknown): ConfirmationInput {
  const parsed = confirmation.safeParse(input);
  if (!parsed.success)
    throw new ServiceError(
      400,
      "INVALID_CONFIRMATION",
      "邮件链接不完整，请申请一封新邮件。",
    );
  return parsed.data;
}

// Error details and credentials never become UI text. Fragments are parsed in the browser.
export function readEmailCallback(params: URLSearchParams): EmailCallback {
  if (params.has("error") || params.has("error_code"))
    return {
      error: params.get("error_code") === "otp_expired" ? "expired" : "invalid",
    };
  const keys = ["code", "token_hash", "type", "access_token", "refresh_token"];
  if (keys.some((key) => params.getAll(key).length > 1))
    return { error: "invalid" };
  const hasHash = params.has("token_hash");
  const hasCode = params.has("code");
  const hasSession = params.has("access_token") || params.has("refresh_token");
  if (!hasHash && !hasCode && !hasSession) return null;
  if (Number(hasHash) + Number(hasCode) + Number(hasSession) !== 1)
    return { error: "invalid" };
  try {
    if (hasHash)
      return {
        input: parseConfirmation({
          tokenHash: params.get("token_hash"),
          type: params.get("type"),
        }),
      };
    if (hasCode)
      return { input: parseConfirmation({ code: params.get("code") }) };
    if (!["invite", "recovery"].includes(params.get("type") ?? ""))
      return { error: "invalid" };
    return {
      input: parseConfirmation({
        accessToken: params.get("access_token"),
        refreshToken: params.get("refresh_token"),
      }),
    };
  } catch {
    return { error: "invalid" };
  }
}

export function resolveEmailCallback(
  query: EmailCallback,
  fragment: EmailCallback,
): Exclude<EmailCallback, null> {
  if (query && "error" in query) return query;
  if (fragment && "error" in fragment) return fragment;
  if (query && fragment) return { error: "invalid" };
  return query ?? fragment ?? { error: "invalid" };
}

// Dashboard invitations use Site URL (the home page) by default.
export function rootEmailCallbackTarget(
  pathname: string,
  search: string,
  hash: string,
): string | null {
  if (pathname !== "/") return null;
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const queryKeys = ["code", "token_hash", "type", "error", "error_code"];
  const fragmentKeys = [
    "access_token",
    "refresh_token",
    "type",
    "error",
    "error_code",
  ];
  const hasReturn =
    queryKeys.filter((key) => key !== "type").some((key) => query.has(key)) ||
    fragmentKeys
      .filter((key) => key !== "type")
      .some((key) => fragment.has(key));
  if (!hasReturn) return null;
  if (search.length + hash.length > 32768)
    return "/auth/confirm?error=invalid_link";
  const pick = (params: URLSearchParams, keys: string[]) => {
    const selected = new URLSearchParams();
    for (const [key, value] of params)
      if (keys.includes(key)) selected.append(key, value);
    return selected.toString();
  };
  const qs = pick(query, queryKeys);
  const hs = pick(fragment, fragmentKeys);
  return `/auth/confirm${qs ? `?${qs}` : ""}${hs ? `#${hs}` : ""}`;
}
export function parsePassword(input: unknown): string {
  const parsed = password.safeParse(input);
  if (!parsed.success)
    throw new ServiceError(
      400,
      "INVALID_PASSWORD",
      "密码须为 8–128 个字符，且两次输入一致。",
    );
  return parsed.data.password;
}
