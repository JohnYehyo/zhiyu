import { vi, it, expect, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { hasR2Config, r2Storage } from "./r2";
afterEach(() => vi.unstubAllEnvs());
it("signs only the configured R2 host/key with required type, exact length and no-overwrite header without networking", async () => {
  vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-test-access");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-test-secret");
  vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
  vi.stubEnv("R2_KEY_PREFIX", "blob");
  vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test");
  const value = await r2Storage().sign(
    "blob/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg",
    "image/jpeg",
    100,
  );
  const url = new URL(value);
  expect(url.hostname).toBe(
    "0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
  );
  expect(url.pathname).toContain("/blob/11111111-1111-4111-8111-111111111111/");
  expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
    "content-length;content-type;host;if-none-match",
  );
  expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
  expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
});
it("empty R2 keys fail closed", () => {
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
  expect(hasR2Config()).toBe(false);
  expect(() => r2Storage()).toThrow(/尚未配置/);
});
