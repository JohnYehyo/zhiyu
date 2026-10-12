import { expect, it } from "vitest";
import { shouldConfirmLink, isSameDocumentAnchor } from "./navigation";

const current = "https://journal.example/admin/posts/a";
it("protects same-window site links while allowing anchors, downloads and new tabs", () => {
  expect(shouldConfirmLink("/admin", current)).toBe(true);
  expect(shouldConfirmLink("/", current)).toBe(true);
  expect(shouldConfirmLink("/about#letter", current)).toBe(true);
  expect(shouldConfirmLink("#main", current)).toBe(false);
  expect(shouldConfirmLink("/admin/posts/a#main", current)).toBe(false);
  expect(shouldConfirmLink("/admin/posts/a", current)).toBe(false);
  expect(shouldConfirmLink("/posts/old-slug", current, "_blank")).toBe(false);
  expect(shouldConfirmLink("/admin", current, "_self", true)).toBe(false);
  expect(shouldConfirmLink("https://outside.example/", current)).toBe(false);
});

it("recognizes native anchor popstate before hashchange without treating route changes as anchors", () => {
  expect(isSameDocumentAnchor(current, `${current}#main`)).toBe(true);
  expect(isSameDocumentAnchor(`${current}#main`, current)).toBe(true);
  expect(isSameDocumentAnchor(current, current)).toBe(false);
  expect(
    isSameDocumentAnchor(current, "https://journal.example/admin#main"),
  ).toBe(false);
  expect(isSameDocumentAnchor(current, `${current}?draft=other#main`)).toBe(
    false,
  );
});
