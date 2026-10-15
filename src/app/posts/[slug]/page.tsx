import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";
import { mediaUrl } from "@/lib/media";
import { documentHeadings } from "@/lib/content/document";
import { PostCard, PostMeta } from "@/components/post-card";
import { RichContent } from "@/components/rich-content";
import { DemoNotice } from "@/components/demo-notice";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  return post
    ? { title: post.title, description: post.excerpt }
    : { title: "没有找到这一页" };
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const cover = mediaUrl(post.coverKey);
  const headings = documentHeadings(post.content);
  const related = (await getPublishedPosts())
    .filter((item) => item.id !== post.id)
    .slice(0, 2);
  return (
    <main className="article-page" id="main">
      <div className="article-breadcrumb">
        <Link href="/archive">
          <ArrowLeft size={15} />
          返回记录
        </Link>
        <span>一页属于我们的记忆</span>
      </div>
      <header className="article-heading">
        <span className="eyebrow">A PAGE FROM OUR SCRAPBOOK</span>
        <h1>{post.title}</h1>
        <PostMeta post={post} />
        <p className="article-deck">{post.excerpt}</p>
        <DemoNotice posts={[post]} />
      </header>
      {cover && (
        <figure className="article-cover">
          <img src={cover} alt={post.title} />
          <figcaption>这一页，留给一个普通的好日子。</figcaption>
        </figure>
      )}
      <div className="article-shell">
        {headings.length > 0 ? (
          <nav className="article-aside" aria-label="文章目录">
            <div className="eyebrow">ON THIS PAGE</div>
            {headings.map(({ id, text }, index) => (
              <a key={id} href={`#${id}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {text}
              </a>
            ))}
          </nav>
        ) : (
          <div />
        )}
        <article className="article-body">
          <RichContent document={post.content} />
          <div className="article-end">
            <p>With love, always.</p>
            <span>写给你的小日子 ♡</span>
          </div>
        </article>
      </div>
      {related.length > 0 && (
        <section className="article-next" aria-labelledby="related-title">
          <div className="article-next-heading">
            <h2 id="related-title">再翻一页吧</h2>
            <Link href="/archive">查看所有记录 ↗</Link>
          </div>
          <div className="article-related">
            {related.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
