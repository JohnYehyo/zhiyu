import Link from "next/link";
import type { Article } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/reading";

export function PostMeta({ post }: { post: Article }) {
  return (
    <div className="story-meta">
      <span
        className={`pill ${post.category === "日常碎片" ? "peach" : post.category === "慢慢长大" ? "yellow" : ""}`}
      >
        {post.category || "小日记"}
      </span>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      {post.demo && <span>示例</span>}
    </div>
  );
}

export function PostCard({ post }: { post: Article }) {
  const cover = mediaUrl(post.coverKey);
  return (
    <article className="story">
      <Link
        href={`/posts/${encodeURIComponent(post.slug)}`}
        className="story-image"
        aria-label={`阅读${post.title}`}
      >
        {cover && <img src={cover} alt="" loading="lazy" />}
      </Link>
      <div>
        <PostMeta post={post} />
        <h3>
          <Link href={`/posts/${encodeURIComponent(post.slug)}`}>
            {post.title}
          </Link>
        </h3>
        <p>{post.excerpt}</p>
      </div>
    </article>
  );
}
