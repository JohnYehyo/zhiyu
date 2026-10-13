"use client";

import { useEffect, useState } from "react";
import { Film, X } from "lucide-react";
import type { MediaRecord } from "@/lib/types";
import type { MediaKind, PageInfo } from "@/lib/admin/queries";
import { adminRequest } from "@/lib/admin/api";
import { mediaUrl } from "@/lib/media";
import { Pagination } from "./pagination";

interface Result {
  media: MediaRecord[];
  pagination: PageInfo;
}
export function MediaPicker({
  imagesOnly = false,
  onSelect,
  onClose,
}: {
  imagesOnly?: boolean;
  onSelect: (media: MediaRecord) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState({
    kind: (imagesOnly ? "image" : "all") as MediaKind,
    page: 1,
  });
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: Result;
    error?: string;
  } | null>(null);
  const url = `/api/admin/media?${new URLSearchParams({ kind: query.kind, page: String(query.page), pageSize: "12" })}`;
  const key = `${url}:${retry}`;
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
            error: cause instanceof Error ? cause.message : "读取素材失败。",
          });
      });
    return () => controller.abort();
  }, [key, url]);

  return (
    <section className="admin-media-picker" aria-label="已上传素材">
      <div className="admin-media-picker-heading">
        <h3>已上传素材</h3>
        <button
          className="admin-button subtle"
          aria-label="关闭素材选择"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <p className="admin-hint">
        选择已完成上传的{imagesOnly ? "图片作为封面" : "图片或视频插入正文"}
        ，无需重复上传。
      </p>
      {!imagesOnly && (
        <label className="admin-media-kind">
          素材类型
          <select
            value={query.kind}
            onChange={(event) =>
              setQuery({ kind: event.target.value as MediaKind, page: 1 })
            }
          >
            <option value="all">图片与视频</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </label>
      )}
      {loading ? (
        <p role="status">正在读取素材…</p>
      ) : state?.error ? (
        <div className="admin-error" role="alert">
          {state.error}
          <button
            className="admin-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            重试
          </button>
        </div>
      ) : data?.media.length === 0 ? (
        <p className="admin-empty">
          还没有可用素材。上传完成后会自动收进这里。
        </p>
      ) : (
        <ul className="admin-media-grid">
          {data?.media.map((media) => {
            const image = media.mimeType.startsWith("image/");
            return (
              <li key={media.id}>
                <button
                  disabled={
                    media.status !== "ready" ||
                    !mediaUrl(media.storageKey) ||
                    (imagesOnly && !image)
                  }
                  onClick={() => onSelect(media)}
                >
                  <span className="admin-media-thumb">
                    {image ? (
                      <img
                        src={mediaUrl(media.storageKey)}
                        alt={media.filename || "已上传图片"}
                        loading="lazy"
                      />
                    ) : (
                      <Film size={28} />
                    )}
                  </span>
                  <strong>
                    {media.filename || (image ? "已上传图片" : "已上传视频")}
                  </strong>
                  <span className="admin-hint">
                    {(media.size / 1024 / 1024).toFixed(1)} MiB ·{" "}
                    {media.mimeType.split("/")[1]}
                  </span>
                  {media.createdAt && (
                    <time dateTime={media.createdAt}>
                      {new Date(media.createdAt).toLocaleDateString("zh-CN")}
                    </time>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {data && (
        <Pagination
          value={data.pagination}
          onChange={(page) => setQuery((value) => ({ ...value, page }))}
        />
      )}
    </section>
  );
}
