import type { Article } from "./types";
import { documentText } from "./content/document";

export function filterPosts(posts: Article[], category: string, query: string): Article[] {
  const needle = query.trim().toLocaleLowerCase();
  return posts.filter((post) => (category === "全部" || post.category === category) &&
    (!needle || `${post.title}\n${post.excerpt}\n${documentText(post.content)}`.toLocaleLowerCase().includes(needle)));
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "日期待补充" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" }).format(date).replaceAll("/", ".");
}
