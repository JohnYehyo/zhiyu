"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import { FlowerMark } from "./flower-mark";

const links = [
  { href: "/", label: "日记" },
  { href: "/album", label: "相册" },
  { href: "/about#letter", label: "写给你" },
  { href: "/archive", label: "归档" },
  { href: "/about", label: "关于" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="header">
        <Link
          className="brand"
          href="/"
          aria-label="芝语首页"
          onClick={() => setOpen(false)}
        >
          <FlowerMark />
          <div>
            <strong>芝语</strong>
            <span>OUR LITTLE KEEPSAKES</span>
          </div>
        </Link>
        <div className="header-right">
          <nav className="site-nav" aria-label="博客导航">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            className="search-button"
            href="/archive#search"
            aria-label="搜索日记"
            onClick={() => setOpen(false)}
          >
            <Search className="icon" />
          </Link>
          <button
            className="mobile-menu"
            aria-label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="icon" /> : <Menu className="icon" />}
          </button>
        </div>
      </header>
      {open && (
        <nav
          className="mobile-nav"
          id="mobile-navigation"
          aria-label="手机博客导航"
        >
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
              <ArrowRight className="icon" />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
