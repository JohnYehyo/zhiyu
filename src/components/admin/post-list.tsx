"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Search, RefreshCw, Trash2 } from "lucide-react";
import type { DraftPost } from "@/lib/types";
import type { PageInfo, PostStatus } from "@/lib/admin/queries";
import { adminRequest } from "@/lib/admin/api";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Pagination } from "./pagination";

interface Result {
  posts: DraftPost[];
  pagination: PageInfo;
}

export function PostList() {
  const router = useRouter();
  const [query, setQuery] = useState({
    q: "",
    status: "all" as PostStatus,
    page: 1,
  });
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: Result;
    error?: string;
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const url = `/api/admin/posts?${new URLSearchParams({ q: query.q, status: query.status, page: String(query.page), pageSize: "20" })}`;
  const key = `${url}:${refresh}`;
  const loading = state?.key !== key;
  const data = loading ? undefined : state?.data;

  useEffect(() => {
    const controller = new AbortController();
    adminRequest<Result>(url, "GET", undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: cause instanceof Error ? cause.message : "读取稿件失败。",
          });
      });
    return () => controller.abort();
  }, [key, url]);

  async function remove(post: DraftPost) {
    if (
      !window.confirm(
        `确定删除《${post.draft.title}》吗？稿件与公开文章将无法恢复；已上传的图片和视频会保留。`,
      )
    )
      return;
    setDeleting(post.id);
    setActionError("");
    try {
      const response = await adminRequest<{ deletedId: string }>(
        `/api/admin/posts/${post.id}`,
        "DELETE",
        { revision: post.revision },
      );
      if (response.deletedId !== post.id)
        throw new Error("删除结果未确认，请刷新列表检查。");
      const pages = Math.max(
        1,
        Math.ceil(((data?.pagination.total ?? 1) - 1) / 20),
      );
      setQuery((current) =>
        current === query
          ? { ...current, page: Math.min(current.page, pages) }
          : current,
      );
      setRefresh((value) => value + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "删除失败，请重试。",
      );
      setRefresh((value) => value + 1);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="admin-list-actions">
        <Link href="/admin/posts/new" className="admin-button primary">
          <Plus size={16} />
          写一篇文字
        </Link>
        <div className="admin-actions">
          <button
            className="admin-button subtle"
            aria-label="刷新文章列表"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} />
          </button>
          <button
            className="admin-button subtle"
            onClick={async () => {
              const result = await getBrowserSupabase()?.auth.signOut();
              if (result?.error) {
                setActionError("退出失败，请重试。");
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
      </div>
      <p className="admin-hint">
        草稿只在后台可见。已发布文章的修改需要再次发布才会更新阅读页。
      </p>
      <form
        className="admin-list-filters"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery((value) => ({ ...value, q: search.trim(), page: 1 }));
        }}
      >
        <label>
          <span>文章标题</span>
          <input
            type="search"
            value={search}
            maxLength={100}
            placeholder="搜索文章标题"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="admin-button" type="submit">
          <Search size={15} />
          搜索
        </button>
        <label>
          <span>发布状态</span>
          <select
            value={query.status}
            onChange={(event) =>
              setQuery((value) => ({
                ...value,
                status: event.target.value as PostStatus,
                page: 1,
              }))
            }
          >
            <option value="all">全部文章</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="changed">有未发布修改</option>
          </select>
        </label>
      </form>
      {actionError && (
        <p role="alert" className="admin-error">
          {actionError}
        </p>
      )}
      {loading ? (
        <p role="status">正在读取稿件…</p>
      ) : state?.error ? (
        <div role="alert" className="admin-error">
          {state.error}
          <button
            className="admin-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            重试
          </button>
        </div>
      ) : data?.posts.length === 0 ? (
        <p className="admin-empty">
          {query.q || query.status !== "all"
            ? "没有找到符合条件的稿件，可以换个标题或状态。"
            : "还没有稿件，写下今天的小事情吧。"}
        </p>
      ) : (
        <ul className="admin-post-list">
          {data?.posts.map((post) => (
            <li key={post.id}>
              <Link href={`/admin/posts/${post.id}`}>
                <div>
                  <h2>{post.draft.title}</h2>
                  <p>
                    {post.draft.category} ·{" "}
                    <time dateTime={post.updatedAt}>
                      {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                    </time>
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
              <button
                className="admin-button subtle admin-delete"
                aria-label={`删除《${post.draft.title}》`}
                title="删除文章"
                disabled={Boolean(deleting)}
                onClick={() => void remove(post)}
              >
                <Trash2 size={16} />
                {deleting === post.id && <span>删除中</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Pagination
          value={data.pagination}
          onChange={(page) => setQuery((value) => ({ ...value, page }))}
          disabled={Boolean(deleting)}
        />
      )}
    </>
  );
}
