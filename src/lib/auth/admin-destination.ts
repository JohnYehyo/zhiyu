/** Only existing, guarded editing pages may be resumed after signing in. */
export function adminDestination(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (["/admin", "/admin/album", "/admin/posts/new"].includes(value)) return value;
  if (/^\/admin\/posts\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) return value;
  return "/admin";
}
export function adminLoginUrl(value: unknown): string {
  const target=adminDestination(value);
  return target==="/admin"?"/admin/login":`/admin/login?next=${encodeURIComponent(target)}`;
}
