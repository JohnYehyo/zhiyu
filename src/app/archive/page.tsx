import Link from "next/link";
import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/posts";
import { Journal } from "@/components/journal";
import { DemoNotice } from "@/components/demo-notice";

export const metadata: Metadata = { title: "记录" };

export default async function Archive() {
  const posts = await getPublishedPosts();
  return (
    <main id="main">
      <header className="page-heading">
        <span className="eyebrow">ONE PAGE AFTER ANOTHER</span>
        <div className="page-heading-row">
          <h1>记录</h1>
          <Link className="text-link page-manage-link" href="/admin" prefetch={false}><PenLine size={14} />管理文章</Link>
        </div>
        <p>按月份慢慢翻，也可以找一段熟悉的小日子。</p>
        <DemoNotice posts={posts} />
      </header>
      <Journal posts={posts} groupByMonth />
    </main>
  );
}
