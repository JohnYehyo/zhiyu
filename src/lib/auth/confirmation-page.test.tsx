import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const verify = vi.hoisted(() => vi.fn());
vi.mock("../supabase/server", () => ({
  getServerSupabase: async () => ({ auth: { verifyOtp: verify } }),
}));
import ConfirmPage from "@/app/auth/confirm/page";
afterEach(() => {
  vi.unstubAllEnvs();
  verify.mockClear();
});

it("opening or prefetching an email page never redeems its one-time link", async () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "synthetic-private");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  const html = renderToStaticMarkup(
    await ConfirmPage({
      searchParams: Promise.resolve({
        token_hash: "synthetic-invitation-hash",
        type: "invite",
      }),
    }),
  );
  expect(html).toContain("确认并设置密码");
  expect(verify).not.toHaveBeenCalled();
  const invalid = renderToStaticMarkup(
    await ConfirmPage({ searchParams: Promise.resolve({ type: "invite" }) }),
  );
  expect(invalid).toContain("申请设置密码邮件");
  expect(verify).not.toHaveBeenCalled();
  const expired = renderToStaticMarkup(
    await ConfirmPage({
      searchParams: Promise.resolve({
        error: "access_denied",
        error_code: "otp_expired",
        error_description: "private-provider-detail",
      }),
    }),
  );
  expect(expired).toContain("已过期或已使用");
  expect(expired).not.toContain("链接不完整");
  expect(expired).not.toContain("private-provider-detail");
  const code = renderToStaticMarkup(
    await ConfirmPage({
      searchParams: Promise.resolve({ code: "synthetic-pkce-code" }),
    }),
  );
  expect(code).toContain("确认并设置密码");
  expect(code).not.toContain("链接不完整");
  expect(verify).not.toHaveBeenCalled();
});
