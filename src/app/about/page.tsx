import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "写给你，也写给日子" };

export default function About() {
  return (
    <main id="main" className="simple-page">
      <header className="page-heading">
        <span className="eyebrow">WITH LOVE, ALWAYS</span>
        <h1>写给你，也写给日子。</h1>
        <p>芝语，一本留住小美好的手帐。</p>
      </header>
      <article className="prose" id="letter">
        <h2>亲爱的小小的你</h2>
        <p>
          长大的路很长。有些日子会被认真记住，有些只是匆匆走过。我想在这里，替你留下那些看起来很小，却很值得珍惜的事情。
        </p>
        <p>
          一朵路边的花，一句天真的话，一次没有目的的散步。等你长大了，我们就一起翻这些小日子，看看当时的阳光、风，还有你。
        </p>
        <blockquote>
          <p>You are so, so loved.</p>
        </blockquote>
        <h2>关于这个小地方</h2>
        <p>
          这里收着日常碎片、出去走走的风景，还有慢慢长大的片刻。没有急着完成的计划，只有一页，又一页。
        </p>
        <p>
          示例故事与插画只用于展示这本手帐的样子；自己的故事，可以从第一篇日记开始。
        </p>
        <Link className="text-link" href="/archive">
          一起翻翻手帐 <ArrowRight className="icon" />
        </Link>
      </article>
    </main>
  );
}
