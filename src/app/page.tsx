import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedPosts } from "@/lib/posts";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/reading";
import { FlowerMark } from "@/components/flower-mark";
import { PostMeta } from "@/components/post-card";
import { Journal } from "@/components/journal";
import { DemoNotice } from "@/components/demo-notice";
import { RootEmailCallback } from "@/components/admin/root-email-callback";

export default async function Home() {
  const posts = await getPublishedPosts();
  const featured = posts[0];
  const cover = featured ? mediaUrl(featured.coverKey) : "";
  return (
    <main id="main">
      <RootEmailCallback />
      <section className="hero paper-grain" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">A SCRAPBOOK, JUST FOR YOU</span>
          <h1 id="hero-title">
            <span>Dear</span> <span>little you.</span>
          </h1>
          <h2>长大的路上，留一点小美好。</h2>
          <p>
            一朵路边的花，一句天真的话。
            <br />
            那些转眼就忘的小事，我想替你好好记着。
          </p>
          <Link className="text-link" href="/about#letter">
            从第一封信开始 <ArrowRight className="icon" />
          </Link>
        </div>
        <div className="hero-art">
          <img
            className="flower-portrait"
            src="/assets/flowers.svg"
            alt="一束粉色和奶油白的花，插在蓝色条纹花瓶里"
          />
          <div className="margin-flower">
            <FlowerMark />
          </div>
          <div className="sticky-note">
            今天也有一件小事，
            <br />
            值得开心很久。<small>with love, always ♡</small>
          </div>
        </div>
      </section>
      <DemoNotice posts={posts} />
      {featured && (
        <section aria-labelledby="featured-title">
          <div className="section-intro">
            <h2 id="featured-title">刚刚收进手帐里</h2>
            <span className="eyebrow">THE LATEST KEEPSAKE</span>
          </div>
          <article className="featured-note">
            <div className="polaroid">
              <Link
                className="story-image"
                href={`/posts/${encodeURIComponent(featured.slug)}`}
                aria-label={`阅读${featured.title}`}
              >
                {cover && <img src={cover} alt="" loading="lazy" />}
              </Link>
              <div className="polaroid-caption">
                <span>A very ordinary, lovely afternoon.</span>
                <span>{formatDate(featured.publishedAt)}</span>
              </div>
            </div>
            <div className="featured-copy">
              <PostMeta post={featured} />
              <h3>
                <Link href={`/posts/${encodeURIComponent(featured.slug)}`}>
                  {featured.title}
                </Link>
              </h3>
              <p>{featured.excerpt}</p>
              <Link
                className="text-link"
                href={`/posts/${encodeURIComponent(featured.slug)}`}
              >
                读这篇小日记 <ArrowRight className="icon" />
              </Link>
            </div>
          </article>
        </section>
      )}
      <section className="journal" id="journal" aria-labelledby="journal-title">
        <div className="section-intro">
          <h2 id="journal-title">一页，又一页</h2>
          <Link className="text-link" href="/archive">
            所有日记 <ArrowRight className="icon" />
          </Link>
        </div>
        <Journal posts={posts} />
      </section>
      <section className="dedication">
        <div>
          <span className="eyebrow">SOME THINGS NEVER CHANGE</span>
          <p>You are so, so loved.</p>
        </div>
        <span>
          等你长大了，
          <br />
          我们再一起翻这些小日子。
        </span>
        <Link className="text-link" href="/about">
          关于这个小地方 <ArrowRight className="icon" />
        </Link>
      </section>
    </main>
  );
}
