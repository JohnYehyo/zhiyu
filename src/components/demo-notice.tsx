import { Info } from "lucide-react";
import type { Article } from "@/lib/types";

export function DemoNotice({ posts }: { posts: Article[] }) {
  if (!posts.some((post) => post.demo)) return null;
  return <p className="demo-notice"><Info size={14} aria-hidden="true" /><span>你正在翻阅示例手帐，文中的故事与素材用于展示。</span></p>;
}
