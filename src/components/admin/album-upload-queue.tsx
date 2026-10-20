"use client";
import { Check, RefreshCw, X } from "lucide-react";
import type { AlbumBatchItem } from "@/lib/admin/album-batch";

export function AlbumUploadQueue({ items, busy, onRetry, onRemove, onClear }: {
  items: AlbumBatchItem[]; busy: boolean; onRetry(id?: number): void; onRemove(id: number): void; onClear(): void;
}) {
  if (!items.length) return null;
  const completed = items.filter((item) => item.state.phase === "done").length;
  const failed = items.filter((item) => !!item.state.error && item.state.phase !== "duplicate");
  return <section className="admin-album-upload" aria-label="批量照片上传队列">
    <div className="admin-album-queue-heading"><p role="status">已加入 {completed} / {items.length} 张{busy ? " · 正在处理" : failed.length ? ` · ${failed.length} 张待重试` : ""}</p><div className="admin-album-add-actions">{failed.length > 0 && <button className="admin-button subtle" disabled={busy} onClick={() => onRetry()}><RefreshCw size={13} />重试失败项</button>}<button className="admin-button subtle" disabled={busy || !items.some((item) => ["done", "duplicate"].includes(item.state.phase))} onClick={onClear}>清除已完成</button></div></div>
    <ul className="admin-album-queue">{items.map((item) => {
      const phase = item.state.phase;
      const done = phase === "done";
      const retry = !!item.state.error && phase !== "duplicate";
      return <li key={item.id}>
        <div className="admin-album-queue-info"><span className="admin-album-queue-name" title={item.name}>{item.name}</span><span className="admin-hint">{done ? "已加入 · 未公开" : phase === "idle" ? "等待上传" : phase === "uploading" ? `上传中 ${item.state.percent}%` : phase === "confirming" ? "确认上传结果…" : phase === "adding" ? "加入相册…" : phase === "duplicate" ? "已在相册中" : phase === "ready" ? "已上传，待加入" : "未完成"}</span>{item.state.error && <span className={phase === "duplicate" ? "admin-hint" : "admin-error"} role={phase === "duplicate" ? undefined : "alert"}>{item.state.error}</span>}{phase === "uploading" && <progress value={item.state.percent} max={100} aria-label={`${item.name} 上传进度`} />}</div>
        <div className="admin-album-queue-actions">{done ? <Check size={15} aria-label="已完成" /> : retry && <button className="admin-button subtle" disabled={busy} onClick={() => onRetry(item.id)} aria-label={`重试 ${item.name}`}><RefreshCw size={14} /></button>}{!done && <button className="admin-button subtle" disabled={busy} onClick={() => onRemove(item.id)} aria-label={`移除队列文件 ${item.name}`}><X size={14} /></button>}</div>
      </li>;
    })}</ul>
    <p className="admin-hint">失败项会保留文件和上传结果。重试会先检查已上传内容；已完成的照片不会重新上传。</p>
  </section>;
}
