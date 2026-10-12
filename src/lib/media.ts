/** Only local bundled examples or server-issued blob/ object keys are readable. */
export function mediaUrl(key: string): string {
  if (typeof key !== "string" || /[\\%?#\u0000-\u001f\u007f]/.test(key)) return "";
  const local = key.startsWith("/assets/");
  if (!local && !key.startsWith("blob/")) return "";
  const segments = key.slice(local ? 1 : 0).split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return "";
  if (local) return key;
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") return "";
    return `${origin.origin}/${segments.map(encodeURIComponent).join("/")}`;
  } catch { return ""; }
}
