import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig, publicSupabaseKey } from "../config";
import { unavailable } from "../server/errors";
export async function getServerSupabase() {
  if (!hasSupabaseConfig()) unavailable();
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicSupabaseKey(),
    {
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
    },
  );
}
