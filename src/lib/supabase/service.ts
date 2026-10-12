import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasWriteConfig } from "../config";
import { unavailable } from "../server/errors";
export function getServiceSupabase() {
  if (!hasWriteConfig()) unavailable();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
