import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { AdminSetup } from "./admin-shell";
afterEach(() => vi.unstubAllEnvs());

it("setup names the missing field and deployment version, displaying no credential values", () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv(
    "NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY",
    "do-not-render-public-key",
  );
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "do-not-render-private-key");
  vi.stubEnv("ADMIN_USER_ID", "");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv(
    "VERCEL_GIT_COMMIT_SHA",
    "2d70936d86609d9afa2e9e502b59014a4b264528",
  );
  const html = renderToStaticMarkup(<AdminSetup />);
  expect(html).toContain("Supabase 地址");
  expect(html).toContain("未设置");
  expect(html).toContain("Production");
  expect(html).toContain("2d70936");
  expect(html).not.toContain("do-not-render-");
  expect(html).not.toContain("https://zhiyu.supabase.co");
});
