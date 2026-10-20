"use client";

import { useEffect, useRef, useState } from "react";
import { FolderPlus, Pencil, Save, Trash2, X } from "lucide-react";
import type { AlbumCollection } from "@/lib/album-types";
import { adminRequest } from "@/lib/admin/api";
import { albumErrorMessage } from "@/lib/admin/album-workflow";

interface Props {
  collections: AlbumCollection[];
  value: string;
  disabled: boolean;
  onChange(value: string): void;
  beforeChange(): boolean;
  onSaved(collection: AlbumCollection): void;
  onDeleted(id: string): void;
  onDirtyChange(dirty: boolean): void;
  onBusyChange(busy: boolean): void;
}
export function AlbumCollections(props: Props) {
  const [editing, setEditing] = useState<{ original?: AlbumCollection; title: string; description: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const active = props.collections.find((collection) => collection.id === props.value);
  const dirty = !!editing && (editing.title !== (editing.original?.title ?? "") || editing.description !== (editing.original?.description ?? ""));
  const { onDirtyChange, onBusyChange } = props;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  function close() {
    if (dirty && !window.confirm("相册集信息还没有保存。放弃修改吗？")) return false;
    setEditing(null); setError(""); return true;
  }
  function start(original?: AlbumCollection) {
    if (editing && !close()) return;
    setEditing({ original, title: original?.title ?? "", description: original?.description ?? "" });
  }
  async function save() {
    if (!editing || lock.current) return;
    if (!editing.original && !props.beforeChange()) return;
    const captured = editing;
    lock.current = true; setBusy(true); onBusyChange(true); setError("");
    try {
      const { collection } = await adminRequest<{ collection: AlbumCollection }>(captured.original ? `/api/admin/album/collections/${captured.original.id}` : "/api/admin/album/collections", captured.original ? "PATCH" : "POST", {
        title: captured.title.trim(), description: captured.description.trim(), ...(captured.original ? { revision: captured.original.revision } : {}),
      });
      props.onSaved(collection); setEditing(null);
    } catch (cause) { setError(albumErrorMessage(cause)); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  async function remove() {
    if (!active || lock.current || !props.beforeChange()) return;
    if (!window.confirm(`删除“${active.title}”？其中的照片将移回未分组，照片和图片素材不会删除，公开状态保持不变。`)) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError("");
    try {
      await adminRequest(`/api/admin/album/collections/${active.id}?revision=${active.revision}`, "DELETE");
      props.onDeleted(active.id); setEditing(null);
    } catch (cause) { setError(albumErrorMessage(cause)); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  const disabled = props.disabled || busy;
  return <section className="admin-album-collections" aria-label="相册集管理">
    <div className="admin-album-collection-toolbar">
      <label className="admin-album-filter">查看<select value={props.value} disabled={disabled} onChange={(event) => { if (!props.beforeChange() || !close()) return; props.onChange(event.target.value); }}>
        <option value="all">所有相片</option><option value="unassigned">未分组</option>
        {props.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}（{collection.photoCount}）</option>)}
      </select></label>
      <button type="button" className="admin-button subtle" disabled={disabled} onClick={() => start()}><FolderPlus size={14} />新建相册集</button>
      {active && <><button type="button" className="admin-button subtle" disabled={disabled} onClick={() => start(active)}><Pencil size={14} />编辑相册集</button><button type="button" className="admin-button subtle" disabled={disabled} onClick={() => void remove()}><Trash2 size={14} />删除相册集</button></>}
    </div>
    {active?.description && !editing && <p className="admin-hint">{active.description}</p>}
    {editing && <form className="admin-album-collection-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={disabled}><label>相册集名称<input required maxLength={100} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label><label>相册集说明<textarea maxLength={1000} rows={2} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label></fieldset>
      <p className="admin-hint">空相册集可先保存；有公开照片后才会在公开相册展示。</p>
      <div className="admin-album-add-actions"><button className="admin-button" disabled={disabled || !editing.title.trim() || !dirty}><Save size={14} />{busy ? "正在保存…" : "保存相册集"}</button><button type="button" className="admin-button subtle" disabled={disabled} onClick={close}><X size={14} />取消</button></div>
    </form>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </section>;
}
