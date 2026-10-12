"use client";

import { useEffect, useState } from "react";
import type { DraftPost } from "@/lib/types";
import { adminRequest } from "@/lib/admin/api";
import { PostEditor } from "./post-editor";

export function EditLoader({ id }: { id: string }) {
  const [post, setPost] = useState<DraftPost | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    adminRequest<{ post: DraftPost }>(`/api/admin/posts/${id}`)
      .then((value) => {
        if (current) setPost(value.post);
      })
      .catch((cause) => {
        if (current)
          setError(cause instanceof Error ? cause.message : "无法读取稿件。");
      });
    return () => {
      current = false;
    };
  }, [id, attempt]);
  if (post) return <PostEditor key={post.id} initialPost={post} />;
  if (error)
    return (
      <div className="admin-error" role="alert">
        {error}
        <button
          className="admin-button"
          onClick={() => {
            setError("");
            setAttempt(attempt + 1);
          }}
        >
          重试
        </button>
      </div>
    );
  return <p role="status">正在读取稿件…</p>;
}
