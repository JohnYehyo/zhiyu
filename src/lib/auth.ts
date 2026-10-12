import "server-only";
import { hasSupabaseConfig, hasWriteConfig } from "./config";
import { getServerSupabase } from "./supabase/server";
import { verifyAdminIdentity } from "./server/security";
import { unavailable } from "./server/errors";
export async function requireAdmin(): Promise<{ userId: string }> {
  if (!hasWriteConfig()) unavailable();
  const client = await getServerSupabase();
  const { data, error } = await client.auth.getUser();
  return verifyAdminIdentity(
    error ? null : data.user,
    process.env.ADMIN_USER_ID,
  );
}
export async function getAdminSession(): Promise<{ userId: string } | null> {
  if (!hasSupabaseConfig() || !process.env.ADMIN_USER_ID?.trim()) return null;
  const client = await getServerSupabase();
  const { data, error } = await client.auth.getUser();
  return !error && data.user?.id === process.env.ADMIN_USER_ID
    ? { userId: data.user.id }
    : null;
}
