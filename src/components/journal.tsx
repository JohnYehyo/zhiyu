"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Article } from "@/lib/types";
import { filterPosts } from "@/lib/reading";
import { PostCard } from "./post-card";

export function Journal({ posts, groupByMonth = false }: { posts: Article[]; groupByMonth?: boolean }) {
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const categories = ["全部", ...new Set(posts.map((post) => post.category).filter(Boolean))];
  const visible = filterPosts(posts, category, query);
  const groups = new Map<string, Article[]>();
  for (const post of visible) {
    const month = groupByMonth ? post.publishedAt.slice(0, 7) : "all";
    const entries = groups.get(month) ?? [];
    entries.push(post);
    groups.set(month, entries);
  }
  return <>
    <div className="journal-tools"><div className="filters" role="group" aria-label="按分类筛选日记">{categories.map((item) => <button key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label className="journal-search" id="search"><Search size={16} aria-hidden="true" /><input type="search" value={query} placeholder="找一段小日子…" aria-label="搜索日记" onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="清除搜索" onClick={() => setQuery("")}><X size={14} /></button>}</label>
    </div>
    <div aria-live="polite" aria-atomic="true" className="small" style={{ marginBottom: 16 }}>{query || category !== "全部" ? `找到 ${visible.length} 篇日记` : null}</div>
    {visible.length === 0 && <p className="empty-state">{posts.length === 0 ? "手帐还在等第一篇日记。" : "这次没有找到，换一个词或分类试试。"}</p>}
    {[...groups].map(([month, entries]) => <div key={month} className={groupByMonth ? "archive-group" : undefined}>{groupByMonth && <h2>{month.replace("-", " 年 ")} 月</h2>}<div className="story-grid">{entries.map((post) => <PostCard key={post.id} post={post} />)}</div></div>)}
  </>;
}
