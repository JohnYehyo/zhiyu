"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Images, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import type { AlbumCollection, AlbumDraft, AlbumPhoto } from "@/lib/album-types";
import type { MediaRecord } from "@/lib/types";
import type { PageInfo } from "@/lib/admin/queries";
import { adminRequest, ApiError, completeUpload, putFile, type PendingUpload } from "@/lib/admin/api";
import { AlbumAddition, albumErrorMessage, albumUpdatePayload, type AlbumAdditionState } from "@/lib/admin/album-workflow";
import { AlbumBatch } from "@/lib/admin/album-batch";
import { protectEditorNavigation } from "@/lib/admin/navigation";
import { mediaUrl } from "@/lib/media";
import { MediaPicker } from "./media-picker";
import { Pagination } from "./pagination";
import { AlbumCollections } from "./album-collections";
import { AlbumUploadQueue } from "./album-upload-queue";
import "./album-manager.css";

export const ALBUM_PAGE_SIZE = 15;

interface AlbumResult {
  photos: AlbumPhoto[];
  pagination: PageInfo;
}
interface Selection {
  photo: AlbumPhoto;
  draft: AlbumDraft;
}
function edit(photo: AlbumPhoto): Selection {
  return { photo, draft: { caption: photo.caption, alt: photo.alt, date: photo.date, collectionId: photo.collectionId ?? null } };
}

export function AlbumManager() {
  const [page, setPage] = useState(1);
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [collections, setCollections] = useState<AlbumCollection[]>([]);
  const [collectionsError, setCollectionsError] = useState("");
  const [uploadCollection, setUploadCollection] = useState("");
  const [collectionDirty, setCollectionDirty] = useState(false);
  const [collectionBusy, setCollectionBusy] = useState(false);
  const [, updateBatch] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: AlbumResult; error?: string } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [picker, setPicker] = useState(false);
  const [addition, setAddition] = useState<AlbumAdditionState>({ phase: "idle", percent: 0 });
  const [action, setAction] = useState<"save" | "publish" | "remove" | null>(null);
  const [actionError, setActionError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  const mutation = useRef(false);
  const editorPanel = useRef<HTMLElement>(null);
  const blocked = useRef(false);
  const navigation = useRef<ReturnType<typeof protectEditorNavigation> | null>(null);
  const [workflow] = useState(() => new AlbumAddition({
    sign: (file) => adminRequest<PendingUpload>("/api/admin/media", "POST", {
      filename: file.name, contentType: file.type, size: file.size,
    }),
    put: putFile,
    confirm: async (id) => (await completeUpload(id)).media,
    create: async (input) => (await adminRequest<{ photo: AlbumPhoto }>("/api/admin/album", "POST", input)).photo,
  }, setAddition));

  const [batch] = useState(() => new AlbumBatch({
    sign: (file) => adminRequest<PendingUpload>("/api/admin/media", "POST", { filename: file.name, contentType: file.type, size: file.size }),
    put: putFile,
    confirm: async (id) => (await completeUpload(id)).media,
    create: async (input) => (await adminRequest<{ photo: AlbumPhoto }>("/api/admin/album", "POST", input)).photo,
  }, () => updateBatch((value) => value + 1), () => {
    setRefresh((value) => value + 1); setMessage("照片已加入相册，尚未公开。");
  }));
  const query = new URLSearchParams({ page: String(page), pageSize: String(ALBUM_PAGE_SIZE) });
  if (collectionFilter !== "all") query.set("collectionId", collectionFilter);
  const url = `/api/admin/album?${query}`;
  const key = `${url}:${refresh}`;
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const adding = ["uploading", "confirming", "adding"].includes(addition.phase);
  const recovering = addition.phase === "pending" || addition.phase === "ready";
  const busy = action !== null || adding || batch.busy || collectionBusy;
  const dirty = !!selection && ["caption", "alt", "date", "collectionId"].some((field) =>
    selection.draft[field as keyof AlbumDraft] !== (field === "collectionId" ? selection.photo.collectionId ?? null : selection.photo[field as keyof AlbumDraft]));

  useEffect(() => {
    mounted.current = true;
    navigation.current = protectEditorNavigation(() => blocked.current);
    return () => { mounted.current = false; navigation.current?.dispose(); };
  }, []);
  useEffect(() => {
    blocked.current = dirty || busy || recovering || batch.hasPending || collectionDirty;
    navigation.current?.update();
  }, [selection, dirty, busy, recovering, batch, batch.hasPending, collectionDirty]);
  useEffect(() => {
    if (selection?.photo.id && window.matchMedia("(max-width: 700px)").matches) {
      editorPanel.current?.focus({ preventScroll: true });
      editorPanel.current?.scrollIntoView({ block: "start" });
    }
  }, [selection?.photo.id]);
  useEffect(() => {
    const controller = new AbortController();
    adminRequest<AlbumResult>(url, "GET", undefined, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch((cause) => {
        if (!controller.signal.aborted) setResult({ key, error: albumErrorMessage(cause) });
      });
    return () => controller.abort();
  }, [url, key]);

  useEffect(() => {
    const controller = new AbortController();
    adminRequest<{ collections: AlbumCollection[] }>("/api/admin/album/collections", "GET", undefined, controller.signal)
      .then(({ collections }) => { if (!controller.signal.aborted) { setCollections(collections); setCollectionsError(""); } })
      .catch((cause) => { if (!controller.signal.aborted) setCollectionsError(albumErrorMessage(cause)); });
    return () => controller.abort();
  }, [refresh]);

  function canLeaveSelection() {
    return !dirty || window.confirm("这张照片的修改还没有保存。放弃修改并继续吗？");
  }
  function selectPhoto(photo: AlbumPhoto) {
    if (photo.id === selection?.photo.id || !canLeaveSelection()) return;
    setSelection(edit(photo));
    setConflict(false);
    setActionError("");
    setMessage("");
  }
  async function added(operation: () => Promise<AlbumPhoto | null>) {
    if (mutation.current) return;
    mutation.current = true;
    setMessage("");
    setActionError("");
    try {
      const photo = await operation();
      if (!mounted.current) return;
      if (photo) {
        // Preserve an existing editor even if another addition finishes later.
        setSelection((current) => current ?? edit(photo));
        setMessage("照片已加入相册，尚未公开。填写图注后可保存或公开。");
        setRefresh((value) => value + 1);
      } else if (workflow.state.phase === "duplicate") {
        setRefresh((value) => value + 1);
      }
    } finally { mutation.current = false; }
  }
  function chooseMedia(media: MediaRecord) {
    setPicker(false);
    void added(() => workflow.select(media, uploadCollection || null));
  }
  async function save(published: boolean, publishAction = false) {
    if (!selection || mutation.current || conflict || !form.current?.reportValidity()) return;
    const selected = selection;
    // Capture current form values and revision before waiting for the request.
    const payload = albumUpdatePayload(selected.photo, selected.draft, published);
    mutation.current = true;
    setAction(publishAction ? "publish" : "save");
    setActionError("");
    setMessage("");
    try {
      const { photo } = await adminRequest<{ photo: AlbumPhoto }>(`/api/admin/album/${selected.photo.id}`, "PATCH", payload);
      if (!mounted.current) return;
      setSelection(edit(photo));
      setMessage(publishAction ? (photo.published ? "照片已公开。" : "照片已收起，公开相册不再显示。") : (photo.published ? "已保存，公开相册信息已同步更新。" : "已保存，照片仍未公开。"));
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (!mounted.current) return;
      setActionError(albumErrorMessage(cause));
      if (cause instanceof ApiError && (cause.code === "ALBUM_CONFLICT" || cause.status === 404)) setConflict(true);
    } finally {
      mutation.current = false;
      if (mounted.current) setAction(null);
    }
  }
  async function remove() {
    if (!selection || mutation.current || conflict) return;
    if (!window.confirm("确定把这张照片移出相册吗？相册记录和公开展示将移除，图片素材及日记中的引用仍会保留。")) return;
    const photo = selection.photo;
    mutation.current = true;
    setAction("remove"); setActionError(""); setMessage("");
    try {
      const response = await adminRequest<{ deletedId: string }>(`/api/admin/album/${photo.id}`, "DELETE", { revision: photo.revision });
      if (response.deletedId !== photo.id) throw new Error("移出结果未确认，请刷新列表检查。");
      if (!mounted.current) return;
      setSelection(null);
      setPage((value) => Math.min(value, Math.max(1, Math.ceil(((data?.pagination.total ?? 1) - 1) / ALBUM_PAGE_SIZE))));
      setRefresh((value) => value + 1);
      setMessage("已移出相册，图片素材仍保留。");
    } catch (cause) {
      if (!mounted.current) return;
      setActionError(albumErrorMessage(cause));
      if (cause instanceof ApiError && (cause.code === "ALBUM_CONFLICT" || cause.status === 404)) setConflict(true);
    } finally {
      mutation.current = false;
      if (mounted.current) setAction(null);
    }
  }

  return (
    <div className="admin-album-manager">
      <AlbumCollections collections={collections} value={collectionFilter} disabled={busy} beforeChange={canLeaveSelection} onDirtyChange={setCollectionDirty} onBusyChange={setCollectionBusy}
        onChange={(value) => { setCollectionFilter(value); if (value !== "all") setUploadCollection(value === "unassigned" ? "" : value); setPage(1); setSelection(null); setConflict(false); setActionError(""); }}
        onSaved={(collection) => { if (!collections.some((item) => item.id === collection.id)) { setCollectionFilter(collection.id); setUploadCollection(collection.id); setPage(1); setSelection(null); setConflict(false); setActionError(""); } setCollections((current) => [...current.filter((item) => item.id !== collection.id), collection]); setRefresh((value) => value + 1); setMessage("相册集已保存。"); }}
        onDeleted={(id) => { setCollections((current) => current.filter((item) => item.id !== id)); setCollectionFilter("unassigned"); setUploadCollection((value) => value === id ? "" : value); setPage(1); setSelection(null); setConflict(false); setActionError(""); setRefresh((value) => value + 1); setMessage("相册集已删除，其中照片已移回未分组，公开状态保持不变。"); }} />
      {collectionsError && <p className="admin-error" role="alert">相册集读取失败：{collectionsError} <button className="admin-button subtle" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>重试</button></p>}
      <div className="admin-list-actions">
        <div className="admin-album-add-actions">
          <label className="admin-album-upload-target">上传至<select value={uploadCollection} disabled={busy || recovering} onChange={(event) => setUploadCollection(event.target.value)}><option value="">未分组</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}</select></label>
          <button className="admin-button primary" disabled={busy || recovering} onClick={() => fileInput.current?.click()}><Upload size={15} />上传照片</button>
          <button className="admin-button" disabled={busy || recovering} onClick={() => setPicker((value) => !value)}><Images size={15} />从素材添加</button>
          <input ref={fileInput} className="admin-album-file" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" aria-label="选择相册照片文件" disabled={busy || recovering} onChange={(event) => {
            const files = Array.from(event.target.files ?? []); event.target.value = "";
            if (files.length && !busy && !mutation.current) { batch.enqueue(files, uploadCollection || null); void batch.run(); }
          }} />
        </div>
        <button className="admin-button subtle" aria-label="刷新相册列表" disabled={loading || busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15} /></button>
      </div>
      <p className="admin-hint">相册单独管理，不会自动收录日记照片。新照片默认未公开；从素材添加无需重复上传。</p>
      {picker && !busy && !recovering && <div className="admin-album-picker"><p className="admin-hint">选择一张图片加入相册，日记中使用的同一素材不受影响。</p><MediaPicker imagesOnly onSelect={chooseMedia} onClose={() => setPicker(false)} /></div>}
      {(adding || recovering || addition.error) && <section className="admin-album-upload" aria-label="照片添加状态">
        {adding && <p role="status">{addition.phase === "uploading" ? `正在上传照片… ${addition.percent}%` : addition.phase === "confirming" ? "正在确认图片上传结果…" : "图片已就绪，正在加入相册…"}</p>}
        {addition.phase === "uploading" && <progress value={addition.percent} max={100} aria-label="照片上传进度" />}
        {addition.error && <p className="admin-error" role="alert">{addition.error}</p>}
        {recovering && <><p className="admin-hint">{addition.phase === "pending" ? "已保留这次上传。先确认结果，成功后会加入相册。" : "图片已完成上传。重试加入相册即可，无需重新上传。"}</p><div className="admin-album-add-actions"><button className="admin-button" disabled={busy} onClick={() => void added(() => workflow.retry())}><RefreshCw size={14} />{addition.phase === "pending" ? "重试确认上传" : "重试加入相册"}</button><button className="admin-button subtle" disabled={busy} onClick={() => workflow.reset()}>改选其他图片</button></div></>}
        {addition.phase === "duplicate" && <p className="admin-hint">这张图片已经在相册中，可在列表中编辑，或选择其他图片。</p>}
      </section>}
      <AlbumUploadQueue items={batch.items} busy={busy} onRetry={(id) => { if (!mutation.current) void batch.retryFailed(id); }} onClear={() => batch.clearCompleted()} onRemove={(id) => {
        if (window.confirm("从队列移除这个文件？已上传的图片素材会保留，尚未完成的照片不会继续加入相册。")) batch.remove(id);
      }} />
      {message && <p className="admin-album-message" role="status">{message}</p>}
      {actionError && <p className="admin-error" role="alert">{actionError}</p>}
      <div className="admin-album-workspace">
        <section className="admin-album-list" aria-label="相册照片">
          {loading ? <p className="admin-album-placeholder" role="status">正在读取相册…</p> : result?.error ? <div className="admin-error" role="alert"><p>{result.error}</p><button className="admin-button" onClick={() => setRefresh((value) => value + 1)}>重试读取</button></div> : data?.photos.length === 0 ? <p className="admin-empty">{collectionFilter === "all" ? "相册还没有照片。上传照片，或从已上传素材中添加一张。" : "这里还没有照片。可选择此相册集作为上传目标，或在照片信息中调整归属。"}</p> : <ul className="admin-album-grid">
            {data?.photos.map((photo) => <li key={photo.id}><button className="admin-album-photo" aria-pressed={selection?.photo.id === photo.id} aria-controls="album-photo-editor" disabled={busy} onClick={() => selectPhoto(photo)}>
              <span className="admin-album-thumb">{mediaUrl(photo.storageKey) ? <img src={mediaUrl(photo.storageKey)} alt={photo.alt || "相册照片"} loading="lazy" /> : <Images size={24} />}</span>
              <span className="admin-album-photo-caption">{photo.caption || "未填写图注"}</span><span className="admin-album-photo-meta">{photo.date || new Date(photo.createdAt).toLocaleDateString("zh-CN")} · {photo.published ? "已公开" : "未公开"}</span>
            </button></li>)}
          </ul>}
          {data && <Pagination value={data.pagination} disabled={busy} onChange={(next) => { if (!canLeaveSelection()) return; setSelection(null); setConflict(false); setActionError(""); setPage(next); }} />}
        </section>
        {selection && <section ref={editorPanel} id="album-photo-editor" className="admin-album-edit" aria-label="编辑照片信息" tabIndex={-1}>
          <div className="admin-album-edit-heading"><h2>照片信息</h2><button className="admin-button subtle" aria-label="关闭照片编辑" disabled={busy} onClick={() => { if (canLeaveSelection()) { setSelection(null); setConflict(false); setActionError(""); } }}><X size={15} /></button></div>
          {mediaUrl(selection.photo.storageKey) && <img className="admin-album-preview" src={mediaUrl(selection.photo.storageKey)} alt={selection.draft.alt || "选中的相册照片"} />}
          <form ref={form} onSubmit={(event) => { event.preventDefault(); void save(selection.photo.published); }}>
            <fieldset disabled={busy}>
              <label>图注<textarea rows={3} maxLength={1000} value={selection.draft.caption} placeholder="写下这张照片的故事" onChange={(event) => setSelection({ ...selection, draft: { ...selection.draft, caption: event.target.value } })} /></label>
              <label>内容说明<textarea rows={2} maxLength={500} value={selection.draft.alt} placeholder="简要描述画面，便于无障碍阅读" onChange={(event) => setSelection({ ...selection, draft: { ...selection.draft, alt: event.target.value } })} /></label>
              <label>所属相册集<select value={selection.draft.collectionId ?? ""} onChange={(event) => setSelection({ ...selection, draft: { ...selection.draft, collectionId: event.target.value || null } })}><option value="">未分组</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}</select></label>
              <label>照片日期<input type="date" value={selection.draft.date} onChange={(event) => setSelection({ ...selection, draft: { ...selection.draft, date: event.target.value } })} /></label>
            </fieldset>
            <p className="admin-hint">日期留空时按加入时间排序。{selection.photo.published ? "保存会同步更新公开相册。" : "保存后仍未公开。"}</p>
            <div className="admin-album-edit-status" role="status">{busy ? (action === "remove" ? "正在移出…" : action ? "正在保存…" : "正在添加照片…") : dirty ? "有未保存的修改" : selection.photo.published ? "已保存 · 已公开" : "已保存 · 未公开"}</div>
            <div className="admin-album-edit-actions"><button type="submit" className="admin-button" disabled={busy || !dirty || conflict}><Save size={14} />保存修改</button><button type="button" className="admin-button primary" disabled={busy || conflict} onClick={() => void save(!selection.photo.published, true)}>{selection.photo.published ? <EyeOff size={14} /> : <Eye size={14} />}{selection.photo.published ? "收起照片" : "公开照片"}</button></div>
            {dirty && <p className="admin-hint">公开或收起时，会一并保存上面的修改。</p>}
            {conflict && <div className="admin-album-conflict"><p>服务器上的照片已变化，本地修改仍保留。重新选择前请先保留需要的文字。</p><button type="button" className="admin-button" disabled={busy} onClick={() => { if (canLeaveSelection()) { setSelection(null); setConflict(false); setActionError(""); setRefresh((value) => value + 1); } }}>放弃本地修改并刷新</button></div>}
            <button type="button" className="admin-button subtle admin-album-remove" disabled={busy || conflict} onClick={() => void remove()}><Trash2 size={14} />移出相册</button>
          </form>
        </section>}
      </div>
    </div>
  );
}
