import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasWriteConfig, publicSupabaseUrl } from "../config";
import { unavailable } from "../server/errors";
export function getServiceSupabase() {
  if (!hasWriteConfig()) unavailable();
  return createClient(
    publicSupabaseUrl(),
    process.env.zhiyu_SUPABASE_SECRET_KEY?.trim() ||
      process.env.zhiyu_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
