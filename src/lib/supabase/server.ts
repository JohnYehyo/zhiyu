import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  hasSupabaseConfig,
  publicSupabaseKey,
  publicSupabaseUrl,
} from "../config";
import { unavailable } from "../server/errors";
export async function getServerSupabase() {
  if (!hasSupabaseConfig()) unavailable();
  const store = await cookies();
  return createServerClient(publicSupabaseUrl(), publicSupabaseKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server components rely on the protected-route proxy for refresh. */
        }
      },
    },
  });
}
