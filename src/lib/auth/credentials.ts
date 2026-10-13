import { z } from "zod";
import { ServiceError } from "../server/errors";

const email = z.string().trim().email().max(254);
const recovery = z.object({ email }).strict();
const login = z
  .object({ email, password: z.string().min(1).max(1024) })
  .strict();

export function parseRecovery(input: unknown): { email: string } {
  const result = recovery.safeParse(input);
  if (!result.success)
    throw new ServiceError(400, "INVALID_EMAIL", "请填写有效的邮箱地址。");
  return result.data;
}
export function parseLogin(input: unknown): {
  email: string;
  password: string;
} {
  const result = login.safeParse(input);
  if (!result.success)
    throw new ServiceError(400, "INVALID_LOGIN", "请填写邮箱和密码。");
  return result.data;
}
