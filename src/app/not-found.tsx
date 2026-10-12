import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="simple-page">
      <header className="page-heading">
        <span className="eyebrow">A LITTLE EMPTY PAGE</span>
        <h1>这一页还没有写下。</h1>
        <p>可能日记换了位置，也可能故事还在路上。</p>
      </header>
      <Link className="text-link" href="/archive">
        回到所有小日记
      </Link>
    </main>
  );
}
