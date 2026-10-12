import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/posts";
import { Journal } from "@/components/journal";
import { DemoNotice } from "@/components/demo-notice";

export const metadata: Metadata = { title: "所有小日记" };

export default async function Archive() {
  const posts = await getPublishedPosts();
  return (
    <main id="main">
      <header className="page-heading">
        <span className="eyebrow">ONE PAGE AFTER ANOTHER</span>
        <h1>所有小日记</h1>
        <p>按月份慢慢翻，也可以找一段熟悉的小日子。</p>
        <DemoNotice posts={posts} />
      </header>
      <Journal posts={posts} groupByMonth />
    </main>
  );
}
