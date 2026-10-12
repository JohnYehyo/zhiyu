"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import type { DraftPost } from "@/lib/types";
import { adminRequest } from "@/lib/admin/api";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function PostList() {
  const router = useRouter();
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setPosts(
        (await adminRequest<{ posts: DraftPost[] }>("/api/admin/posts")).posts,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取稿件失败。");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let current = true;
    adminRequest<{ posts: DraftPost[] }>("/api/admin/posts")
      .then((value) => {
        if (current) setPosts(value.posts);
      })
      .catch((cause) => {
        if (current)
          setError(cause instanceof Error ? cause.message : "读取稿件失败。");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);
  return (
    <>
      <div className="admin-list-actions">
        <Link href="/admin/posts/new" className="admin-button primary">
          <Plus size={16} />
          写一篇日记
        </Link>
        <button
          className="admin-button subtle"
          onClick={async () => {
            const result = await getBrowserSupabase()?.auth.signOut();
            if (result?.error) {
              setError("退出失败，请重试。");
              return;
            }
            router.replace("/admin/login");
            router.refresh();
          }}
        >
          <LogOut size={15} />
          退出
        </button>
      </div>
      <p className="admin-hint">
        草稿只在后台可见。已发布文章的修改需要再次发布才会更新阅读页。
      </p>
      {loading ? (
        <p role="status">正在读取稿件…</p>
      ) : error ? (
        <div role="alert" className="admin-error">
          {error}
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              void load();
            }}
            className="admin-button"
          >
            重试
          </button>
        </div>
      ) : posts.length === 0 ? (
        <p className="admin-empty">还没有稿件，写下今天的小事情吧。</p>
      ) : (
        <ul className="admin-post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/admin/posts/${post.id}`}>
                <div>
                  <h2>{post.draft.title}</h2>
                  <p>
                    {post.draft.category} ·{" "}
                    {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <span>
                  {post.publishedRevision === null
                    ? "草稿"
                    : post.publishedRevision === post.revision
                      ? "已发布"
                      : "有未发布修改"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
