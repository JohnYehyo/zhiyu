import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/reading";
import { DemoNotice } from "@/components/demo-notice";

export const metadata: Metadata = { title: "小小相册" };

export default async function Album() {
  const posts = await getPublishedPosts();
  const photos = posts.filter((post) => mediaUrl(post.coverKey));
  return (
    <main id="main">
      <header className="page-heading">
        <span className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</span>
        <h1>小小相册</h1>
        <p>把照片翻过来，背面是那一天的小日记。</p>
        <DemoNotice posts={posts} />
      </header>
      {photos.length === 0 && (
        <p className="empty-state">相册还在等第一张照片。</p>
      )}
      <div className="album-grid">
        {photos.map((post) => (
          <figure key={post.id} className="album-print">
            <Link href={`/posts/${encodeURIComponent(post.slug)}`}>
              <img
                src={mediaUrl(post.coverKey)}
                alt={post.title}
                loading="lazy"
              />
              <figcaption>
                {post.title}
                <small>
                  {formatDate(post.publishedAt)} · {post.category}
                  {post.demo ? " · 示例" : ""}
                </small>
              </figcaption>
            </Link>
          </figure>
        ))}
      </div>
    </main>
  );
}
