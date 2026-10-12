"use client";

export default function ReadingError({ reset }: { reset: () => void }) {
  return <main id="main" className="simple-page"><header className="page-heading"><h1>这次没能翻开手帐。</h1><p>读取暂时出了问题，请稍后再试。</p></header><button className="text-link" onClick={reset}>重新读取</button></main>;
}
