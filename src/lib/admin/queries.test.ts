import { expect, it } from "vitest";
import {
  literalSearchPattern,
  parseMediaQuery,
  parsePostQuery,
} from "./queries";

it("parses bounded pages and trims a title search without losing punctuation", () => {
  expect(
    parsePostQuery(
      new URLSearchParams(
        "page=2&pageSize=10&status=changed&q=  今天,(雨)%_  ",
      ),
    ),
  ).toEqual({ page: 2, pageSize: 10, status: "changed", q: "今天,(雨)%_" });
  expect(literalSearchPattern("a%_\\b")).toBe("%a\\%\\_\\\\b%");
});
it("rejects invalid pagination, duplicate fields, and unknown filters", () => {
  for (const value of [
    "page=0",
    "page=1.5",
    "page=1e2",
    "pageSize=101",
    "status=anything",
    "page=1&page=2",
    `q=${"a".repeat(101)}`,
  ]) {
    expect(() => parsePostQuery(new URLSearchParams(value))).toThrow(
      /筛选条件无效/,
    );
  }
});
it("media queries cannot opt into pending uploads or another owner's records", () => {
  expect(parseMediaQuery(new URLSearchParams("kind=video&page=3"))).toEqual({
    kind: "video",
    page: 3,
    pageSize: 12,
  });
  for (const value of [
    "kind=html",
    "status=pending",
    "owner=other",
    "pageSize=0",
  ]) {
    expect(() => parseMediaQuery(new URLSearchParams(value))).toThrow(
      /筛选条件无效/,
    );
  }
});
