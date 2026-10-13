import { afterEach, expect, it, vi } from "vitest";
import { recoverySiteRedirect } from "./site";
afterEach(() => vi.unstubAllEnvs());

it("keeps Vercel recovery on the configured site before any verifier or mail is created", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://zhiyu-beta.vercel.app");
  expect(recoverySiteRedirect("zhiyu-synthetic-user.vercel.app")).toBe(
    "https://zhiyu-beta.vercel.app/admin/password",
  );
  expect(recoverySiteRedirect("zhiyu-beta.vercel.app")).toBeNull();
  expect(recoverySiteRedirect("localhost:3000")).toBeNull();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "javascript:unsafe");
  expect(recoverySiteRedirect("zhiyu-synthetic-user.vercel.app")).toBe(
    "https://zhiyu-beta.vercel.app/admin/password",
  );
});
