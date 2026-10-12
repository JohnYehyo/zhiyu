import { describe, expect, it } from "vitest";
import type { Article } from "./types";
import { filterPosts } from "./reading";

const posts: Article[] = [
  { id: "1", title: "草莓的下午", slug: "strawberry", excerpt: "小花与风", category: "日常碎片", coverKey: "", publishedAt: "2026-05-18", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "An Ordinary Afternoon" }] }] } },
  { id: "2", title: "海边散步", slug: "sea", excerpt: "蓝色", category: "出去走走", coverKey: "", publishedAt: "2026-05-12", content: { type: "doc", content: [] } },
];

describe("journal discovery", () => {
  it("combines category and case-insensitive full text search", () => {
    expect(filterPosts(posts, "日常碎片", "  ordinary ").map((post) => post.id)).toEqual(["1"]);
    expect(filterPosts(posts, "出去走走", "ordinary")).toEqual([]);
  });
  it("searches titles and excerpts without hiding valid empty results", () => {
    expect(filterPosts(posts, "全部", "小花").map((post) => post.id)).toEqual(["1"]);
    expect(filterPosts(posts, "全部", "海边").map((post) => post.id)).toEqual(["2"]);
    expect(filterPosts([], "全部", "")).toEqual([]);
    expect(filterPosts(posts, "全部", "不存在")).toEqual([]);
  });
});
