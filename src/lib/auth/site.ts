/** Switch sites before requesting mail so a PKCE verifier never starts on the wrong Vercel domain. */
export function recoverySiteRedirect(host: string): string | null {
  if (!host.toLowerCase().endsWith(".vercel.app")) return null;
  let site = new URL("https://zhiyu-beta.vercel.app");
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (
      configured.protocol === "https:" &&
      !configured.username &&
      !configured.password &&
      configured.pathname === "/" &&
      !configured.search &&
      !configured.hash
    )
      site = configured;
  } catch {
    /* Use the existing project domain when integration site configuration is absent. */
  }
  return host.toLowerCase() === site.host.toLowerCase()
    ? null
    : `${site.origin}/admin/password`;
}
