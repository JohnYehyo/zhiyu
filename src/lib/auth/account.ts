import { z } from "zod";
import { ServiceError } from "../server/errors";
export type ConfirmationType = "invite" | "recovery";
const confirmation = z
  .object({
    tokenHash: z
      .string()
      .min(16)
      .max(256)
      .regex(/^[a-zA-Z0-9_-]+$/),
    type: z.enum(["invite", "recovery"]),
  })
  .strict();
const password = z
  .object({
    password: z.string().min(8).max(128),
    confirmation: z.string().min(8).max(128),
  })
  .strict()
  .refine((value) => value.password === value.confirmation);
export function parseConfirmation(input: unknown): {
  tokenHash: string;
  type: ConfirmationType;
} {
  const parsed = confirmation.safeParse(input);
  if (!parsed.success)
    throw new ServiceError(
      400,
      "INVALID_CONFIRMATION",
      "邮件链接不完整，请申请一封新邮件。",
    );
  return parsed.data;
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
