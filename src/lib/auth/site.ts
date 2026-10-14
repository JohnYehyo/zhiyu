/** Only deployment-specific Vercel hosts move to the configured fixed site. */
function canonicalSite(host: string): URL | null {
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
    : site;
}

/** Switch sites before mail creates a domain-bound PKCE verifier. */
export function recoverySiteRedirect(host: string): string | null {
  const site = canonicalSite(host);
  return site ? `${site.origin}/admin/password` : null;
}

/** Keep real editing and R2 uploads on one origin; local demo remains usable in previews. */
export function adminSiteRedirect(host: string, pathname: string, search = ""): string | null {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;
  if (pathname === "/admin/demo" || pathname === "/admin/demo/") return null;
  const site = canonicalSite(host);
  if (!site) return null;
  site.pathname = pathname;
  site.search = search;
  return site.toString();
}
