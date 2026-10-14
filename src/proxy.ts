import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasSupabaseConfig,
  publicSupabaseKey,
  publicSupabaseUrl,
} from "./lib/config";
import { adminSiteRedirect } from "./lib/auth/site";
export async function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    const target = adminSiteRedirect(
      request.headers.get("host") ?? request.nextUrl.host,
      request.nextUrl.pathname,
      request.nextUrl.search,
    );
    if (target) {
      const response = NextResponse.redirect(target, 307);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  let response = NextResponse.next({ request });
  if (!hasSupabaseConfig()) return response;
  const client = createServerClient(publicSupabaseUrl(), publicSupabaseKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
