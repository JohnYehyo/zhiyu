import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} 芝语 · ZHIYU</span>
      <span>写给你，也写给每一个普通的好日子。</span>
      <div className="footer-links">
        <Link href="/about">关于这里 ↗</Link>
        <Link href="/admin">管理</Link>
      </div>
    </footer>
  );
}
