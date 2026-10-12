/** Client-safe readiness. Use direct public references so Next inlines them. */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    validProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      publicSupabaseKey(),
  );
}
export function publicSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}
function validProjectUrl(value: string | undefined): boolean {
  try {
    const url = new URL(value ?? "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
/** Call on the server; expose only its boolean result to UI. */
export function hasWriteConfig(): boolean {
  return (
    hasSupabaseConfig() &&
    Boolean(
      (process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
        /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(
          process.env.ADMIN_USER_ID ?? "",
        ),
    )
  );
}
