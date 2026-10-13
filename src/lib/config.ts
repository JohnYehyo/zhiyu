/** Client-safe readiness. Use direct public references so Next inlines them. */
export function hasSupabaseConfig(): boolean {
  return Boolean(validProjectUrl(publicSupabaseUrl()) && publicSupabaseKey());
}
export function publicSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_zhiyu_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}
export function publicSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_zhiyu_SUPABASE_ANON_KEY?.trim() ||
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
  return Object.values(writeConfigStatus()).every(
    (status) => status === "configured",
  );
}
export type ConfigStatus = "configured" | "missing" | "invalid";
/** Server-side diagnostics: statuses only, never configuration values. */
export function writeConfigStatus(): Record<
  "url" | "publicKey" | "serviceKey" | "adminUserId",
  ConfigStatus
> {
  const url = publicSupabaseUrl();
  const admin = process.env.ADMIN_USER_ID ?? "";
  const serviceKey = Boolean(
    process.env.zhiyu_SUPABASE_SECRET_KEY?.trim() ||
    process.env.zhiyu_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  return {
    url: !url ? "missing" : validProjectUrl(url) ? "configured" : "invalid",
    publicKey: publicSupabaseKey() ? "configured" : "missing",
    serviceKey: serviceKey ? "configured" : "missing",
    adminUserId: !admin.trim()
      ? "missing"
      : /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(admin)
        ? "configured"
        : "invalid",
  };
}
