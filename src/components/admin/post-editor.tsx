"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImagePlus,
  Video,
  Undo2,
  Redo2,
  Eye,
  PenLine,
  Download,
  Upload,
  Save,
  Images,
} from "lucide-react";
import type { DraftPost, PostDraft, RichNode, MediaRecord } from "@/lib/types";
import { SaveCoordinator } from "@/lib/admin/save-coordinator";
import { defaultSlug, serializeEditorDocument } from "@/lib/admin/content";
import {
  adminRequest,
  completeUpload,
  postTransport,
  putFile,
  validateUpload,
  type PendingUpload,
} from "@/lib/admin/api";
import { safeLink } from "@/lib/content/document";
import { mediaUrl } from "@/lib/media";
import { RichContent } from "@/components/rich-content";
import { EditorImage, EditorVideo } from "./media-node";
import { protectEditorNavigation } from "@/lib/admin/navigation";
import { MediaPicker } from "./media-picker";

const emptyDraft = (): PostDraft => ({
  title: "",
  slug: defaultSlug(),
  category: "日常碎片",
  excerpt: "",
  coverKey: "",
  content: { type: "doc", content: [{ type: "paragraph" }] },
});
const labels = {
  dirty: "有未保存修改",
  saving: "正在保存…",
  saved: "草稿已保存",
  publishing: "正在更新发布状态…",
  error: "保存失败",
  conflict: "版本冲突，已暂停保存",
};

export function PostEditor({
  initialPost,
  initialDraft,
  demo = false,
}: {
  initialPost?: DraftPost;
  initialDraft?: PostDraft;
  demo?: boolean;
}) {
  const [queue] = useState(
    () =>
      new SaveCoordinator(
        initialPost?.draft ?? initialDraft ?? emptyDraft(),
        initialPost ?? null,
        postTransport,
      ),
  );
  const [snapshot, setSnapshot] = useState(() => queue.snapshot());
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [picker, setPicker] = useState<"body" | "cover" | null>(null);
  const [upload, setUpload] = useState<{
    percent: number;
    busy: boolean;
    pending?: PendingUpload;
    kind?: "image" | "video";
    cover?: boolean;
    error?: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadBusy = useRef(false);
  const navigationProtection = useRef<ReturnType<
    typeof protectEditorNavigation
  > | null>(null);
  const uploadTarget = useRef<{ kind: "image" | "video"; cover: boolean }>({
    kind: "image",
    cover: false,
  });
  const draft = snapshot.draft;
  const validFields = Boolean(
    draft.title.trim() &&
    draft.title.length <= 200 &&
    draft.category.trim() &&
    draft.category.length <= 60 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) &&
    draft.slug.length <= 120 &&
    draft.excerpt.length <= 1000,
  );

  useEffect(
    () => queue.subscribe(() => setSnapshot(queue.snapshot())),
    [queue],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
        heading: { levels: [2, 3] },
        trailingNode: false,
      }),
      EditorImage,
      EditorVideo,
    ],
    immediatelyRender: false,
    content: draft.content,
    editorProps: {
      attributes: {
        class: "admin-tiptap",
        role: "textbox",
        "aria-label": "日记正文",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => {
      queue.update({
        ...queue.snapshot().draft,
        content: serializeEditorDocument(editor.getJSON() as RichNode),
      });
      setMessage("");
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            heading: editor.isActive("heading"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
            media: editor.isActive("image")
              ? "image"
              : editor.isActive("video")
                ? "video"
                : null,
            attrs: editor.isActive("image")
              ? editor.getAttributes("image")
              : editor.isActive("video")
                ? editor.getAttributes("video")
                : {},
          }
        : null,
  });

  useEffect(() => {
    if (
      demo ||
      !validFields ||
      snapshot.status === "conflict" ||
      snapshot.status === "error" ||
      !snapshot.dirty
    )
      return;
    const timer = setTimeout(() => {
      void queue.flush().catch(() => undefined);
    }, 1200);
    return () => clearTimeout(timer);
  }, [demo, queue, snapshot, validFields]);

  useEffect(() => {
    const protection = protectEditorNavigation(
      () => queue.snapshot().hasUnsavedChanges || uploadBusy.current,
    );
    navigationProtection.current = protection;
    return () => {
      protection.dispose();
      navigationProtection.current = null;
    };
  }, [queue]);

  useEffect(() => {
    uploadBusy.current = Boolean(upload?.busy);
  }, [upload?.busy]);

  // Native history updates the URL without fetching a new editor or resetting newer typing.
  useEffect(() => {
    if (!demo && snapshot.post && !initialPost)
      window.history.replaceState(
        window.history.state,
        "",
        `/admin/posts/${snapshot.post.id}`,
      );
  }, [demo, initialPost, snapshot.post]);

  useEffect(() => {
    navigationProtection.current?.update();
  }, [snapshot, upload?.busy]);

  const updateField = (
    name: keyof Omit<PostDraft, "content">,
    value: string,
  ) => {
    queue.update({ ...queue.snapshot().draft, [name]: value });
    setMessage("");
  };

  async function act(action: "save" | "publish" | "unpublish") {
    setMessage("");
    if (!validFields) {
      setMessage("请填写标题、分类和有效的文章地址，再保存或发布。");
      return;
    }
    setActionBusy(true);
    try {
      if (action === "save") await queue.flush();
      else if (action === "publish") await queue.publish();
      else await queue.unpublish();
      if (action === "publish")
        setMessage("已发布。本次保存的内容已更新到阅读页。");
      if (action === "unpublish") setMessage("已撤回，稿件保留在后台。");
    } catch {
      /* Coordinator keeps the actionable error and local document. */
    } finally {
      setActionBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(queue.snapshot().draft, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.slug || "journal"}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function chooseFile(kind: "image" | "video", cover = false) {
    uploadTarget.current = { kind, cover };
    if (fileInput.current) {
      fileInput.current.accept =
        kind === "image"
          ? "image/jpeg,image/png,image/webp,image/gif"
          : "video/mp4,video/webm,video/quicktime";
      fileInput.current.click();
    }
  }

  async function finishUpload(
    pending: PendingUpload,
    kind: "image" | "video",
    cover: boolean,
  ) {
    const result = await completeUpload(pending.media.id);
    if (result.media.status !== "ready")
      throw new Error("媒体尚未确认就绪，请重试确认。");
    if ((kind === "image") !== result.media.mimeType.startsWith("image/"))
      throw new Error("媒体类型不匹配，请重新选择。");
    insertMedia(result.media, cover);
    setUpload(null);
    setMessage(
      cover ? "封面已上传。" : "媒体已插入，点击媒体可填写说明和图注。",
    );
  }

  function insertMedia(media: MediaRecord, cover: boolean) {
    const url = mediaUrl(media.storageKey);
    if (media.status !== "ready") throw new Error("媒体尚未完成上传。");
    if (!url)
      throw new Error(
        "媒体公共地址未配置或不可用，请检查 NEXT_PUBLIC_MEDIA_BASE_URL。",
      );
    const kind = media.mimeType.startsWith("image/") ? "image" : "video";
    if (cover && kind !== "image") throw new Error("封面只能选择图片。");
    if (cover) updateField("coverKey", media.storageKey);
    else
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: kind,
          attrs: {
            mediaId: media.id,
            storageKey: media.storageKey,
            src: url,
            alt: "",
            caption: "",
          },
        })
        .run();
  }

  async function handleFile(file: File) {
    const { kind, cover } = uploadTarget.current;
    let pending: PendingUpload | undefined;
    setUpload({ percent: 0, busy: true, kind, cover });
    try {
      validateUpload(file, kind);
      pending = await adminRequest<PendingUpload>("/api/admin/media", "POST", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      setUpload({ percent: 0, busy: true, pending, kind, cover });
      await putFile(file, pending, (percent) =>
        setUpload({ percent, busy: true, pending, kind, cover }),
      );
      await finishUpload(pending, kind, cover);
    } catch (cause) {
      setUpload({
        percent: 0,
        busy: false,
        pending,
        kind,
        cover,
        error: cause instanceof Error ? cause.message : "上传失败。",
      });
    }
  }

  const controlsDisabled =
    actionBusy || upload?.busy || snapshot.status === "conflict";
  return (
    <div className="admin-editor">
      {demo && (
        <aside className="admin-demo-note">
          <strong>本地试写 · 不连接云端</strong>
          <p>
            内容只在当前页面保留，刷新会重置。可下载草稿；上传、保存到云端和发布均关闭。
          </p>
        </aside>
      )}
      <div className="admin-editor-bar">
        <p role="status">
          {demo ? "当前页面的本地内容" : labels[snapshot.status]}
        </p>
        <div className="admin-actions">
          <button
            className="admin-button"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? <PenLine size={15} /> : <Eye size={15} />}
            {preview ? "继续编辑" : "预览"}
          </button>
          {demo ? (
            <button className="admin-button" onClick={download}>
              <Download size={15} />
              下载草稿
            </button>
          ) : (
            <>
              <button
                className="admin-button"
                disabled={controlsDisabled}
                onClick={() => void act("save")}
              >
                <Save size={15} />
                保存
              </button>
              <button
                className="admin-button primary"
                disabled={controlsDisabled || !validFields}
                onClick={() => void act("publish")}
              >
                <Upload size={15} />
                发布
              </button>
            </>
          )}
        </div>
      </div>
      {snapshot.error && (
        <div className="admin-error" role="alert">
          <p>{snapshot.error}</p>
          {snapshot.status === "conflict" ? (
            <>
              <p>
                此页面的文字仍在。先下载草稿，再重新打开服务器稿件进行对照；不会自动覆盖其他版本。
              </p>
              <button className="admin-button" onClick={download}>
                <Download size={15} />
                下载本地草稿
              </button>
              {snapshot.post && (
                <a
                  className="admin-button"
                  href={`/admin/posts/${snapshot.post.id}`}
                >
                  重新打开
                </a>
              )}
            </>
          ) : (
            <button
              className="admin-button"
              onClick={() => void act("save")}
              disabled={actionBusy}
            >
              重试保存
            </button>
          )}
        </div>
      )}
      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}
      {upload && (
        <div
          className={upload.error ? "admin-error" : "admin-message"}
          role={upload.error ? "alert" : "status"}
        >
          {upload.busy ? (
            <>
              <span>上传 {upload.percent}% · 完成后验证媒体</span>
              <progress max={100} value={upload.percent} />
            </>
          ) : (
            <>
              <p>{upload.error}</p>
              {upload.pending && (
                <button
                  className="admin-button"
                  onClick={async () => {
                    setUpload({ ...upload, busy: true, error: undefined });
                    try {
                      await finishUpload(
                        upload.pending!,
                        upload.kind!,
                        Boolean(upload.cover),
                      );
                    } catch (cause) {
                      setUpload({
                        ...upload,
                        busy: false,
                        error:
                          cause instanceof Error
                            ? cause.message
                            : "确认失败，请重新上传。",
                      });
                    }
                  }}
                >
                  重试确认上传结果
                </button>
              )}
              <button className="admin-button" onClick={() => setUpload(null)}>
                关闭提示
              </button>
            </>
          )}
        </div>
      )}
      {preview ? (
        <article className="admin-preview">
          <p className="admin-note">
            {demo ? "本地预览" : "当前草稿预览 · 不代表已经发布"} ·{" "}
            {draft.category}
          </p>
          <h2>{draft.title || "还没有标题"}</h2>
          {draft.excerpt && (
            <p className="admin-preview-excerpt">{draft.excerpt}</p>
          )}
          {mediaUrl(draft.coverKey) && (
            <img
              src={mediaUrl(draft.coverKey)}
              alt="文章封面"
              className="admin-cover-preview"
            />
          )}
          <RichContent document={draft.content} />
        </article>
      ) : (
        <>
          <label className="admin-title-field">
            <span>标题</span>
            <input
              aria-label="标题"
              maxLength={200}
              placeholder="今天，想记住什么？"
              value={draft.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>
          <div className="admin-meta-row">
            <label>
              分类
              <input
                maxLength={60}
                value={draft.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                list="journal-categories"
              />
            </label>
            <datalist id="journal-categories">
              <option value="日常碎片" />
              <option value="慢慢长大" />
              <option value="出去走走" />
            </datalist>
            <details className="admin-details">
              <summary>摘要、地址与封面</summary>
              <div>
                <label>
                  摘要
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={draft.excerpt}
                    onChange={(event) =>
                      updateField("excerpt", event.target.value)
                    }
                  />
                </label>
                <label>
                  文章地址
                  <input
                    value={draft.slug}
                    maxLength={120}
                    onChange={(event) =>
                      updateField("slug", event.target.value)
                    }
                    aria-describedby="slug-hint"
                  />
                </label>
                <p id="slug-hint" className="admin-hint">
                  已自动生成；可改为小写字母、数字及连字符。发布后修改地址会替换旧地址。
                </p>
                <div className="admin-cover-controls">
                  {mediaUrl(draft.coverKey) && (
                    <img src={mediaUrl(draft.coverKey)} alt="当前封面" />
                  )}
                  <button
                    className="admin-button"
                    disabled={demo || upload?.busy}
                    onClick={() => chooseFile("image", true)}
                  >
                    <ImagePlus size={15} />
                    上传封面
                  </button>
                  <button
                    className="admin-button subtle"
                    disabled={demo || Boolean(upload?.busy)}
                    onClick={() => setPicker("cover")}
                  >
                    <Images size={15} />
                    从素材选择
                  </button>
                  {draft.coverKey && (
                    <button
                      className="admin-button subtle"
                      onClick={() => updateField("coverKey", "")}
                    >
                      移除封面
                    </button>
                  )}
                </div>
              </div>
            </details>
          </div>
          <div className="admin-toolbar" role="toolbar" aria-label="正文格式">
            {[
              {
                label: "加粗",
                icon: Bold,
                pressed: active?.bold,
                action: () => editor?.chain().focus().toggleBold().run(),
              },
              {
                label: "斜体",
                icon: Italic,
                pressed: active?.italic,
                action: () => editor?.chain().focus().toggleItalic().run(),
              },
              {
                label: "小标题",
                icon: Heading2,
                pressed: active?.heading,
                action: () =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run(),
              },
              {
                label: "项目列表",
                icon: List,
                pressed: active?.bullet,
                action: () => editor?.chain().focus().toggleBulletList().run(),
              },
              {
                label: "有序列表",
                icon: ListOrdered,
                pressed: active?.ordered,
                action: () => editor?.chain().focus().toggleOrderedList().run(),
              },
              {
                label: "引用",
                icon: Quote,
                pressed: active?.quote,
                action: () => editor?.chain().focus().toggleBlockquote().run(),
              },
              {
                label: "链接",
                icon: LinkIcon,
                pressed: active?.link,
                action: () => {
                  const href = window.prompt(
                    "输入链接地址；留空移除链接",
                    editor?.getAttributes("link").href || "",
                  );
                  if (href === null) return;
                  if (!href.trim())
                    editor
                      ?.chain()
                      .focus()
                      .extendMarkRange("link")
                      .unsetLink()
                      .run();
                  else if (safeLink(href))
                    editor
                      ?.chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: href.trim() })
                      .run();
                  else setMessage("请使用 http、https、mailto 或站内地址。");
                },
              },
              {
                label: "撤销",
                icon: Undo2,
                action: () => editor?.chain().focus().undo().run(),
              },
              {
                label: "重做",
                icon: Redo2,
                action: () => editor?.chain().focus().redo().run(),
              },
            ].map(({ label, icon: Icon, action, pressed }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={pressed}
                onClick={action}
                disabled={!editor}
              >
                <Icon size={17} />
              </button>
            ))}
            <span className="admin-toolbar-divider" />
            <button
              title={demo ? "本地示例不上传媒体" : "插入图片"}
              aria-label="插入图片"
              disabled={demo || upload?.busy || !editor}
              onClick={() => chooseFile("image")}
            >
              <ImagePlus size={17} />
            </button>
            <button
              title={demo ? "本地示例不上传媒体" : "插入视频"}
              aria-label="插入视频"
              disabled={demo || upload?.busy || !editor}
              onClick={() => chooseFile("video")}
            >
              <Video size={17} />
            </button>
            <button
              title={demo ? "本地示例不连接素材库" : "选择已上传素材"}
              aria-label="选择已上传素材"
              disabled={demo || Boolean(upload?.busy) || !editor}
              onClick={() =>
                setPicker((value) => (value === "body" ? null : "body"))
              }
            >
              <Images size={17} />
            </button>
          </div>
          {picker && (
            <MediaPicker
              key={picker}
              imagesOnly={picker === "cover"}
              onClose={() => setPicker(null)}
              onSelect={(media) => {
                try {
                  insertMedia(media, picker === "cover");
                  setPicker(null);
                  setMessage(
                    picker === "cover"
                      ? "已选择封面。"
                      : "素材已插入，点击媒体可填写说明和图注。",
                  );
                } catch (cause) {
                  setMessage(
                    cause instanceof Error ? cause.message : "素材无法使用。",
                  );
                }
              }}
            />
          )}
          <EditorContent editor={editor} className="admin-writing-area" />
          {!editor && <p role="status">正在准备编辑器…</p>}
          {active?.media && (
            <div className="admin-media-fields">
              <p>当前{active.media === "image" ? "图片" : "视频"}</p>
              <label>
                内容说明
                <input
                  maxLength={500}
                  value={String(active.attrs.alt || "")}
                  onChange={(event) =>
                    editor
                      ?.chain()
                      .updateAttributes(active.media!, {
                        alt: event.target.value,
                      })
                      .run()
                  }
                />
              </label>
              <label>
                图注
                <input
                  maxLength={1000}
                  value={String(active.attrs.caption || "")}
                  onChange={(event) =>
                    editor
                      ?.chain()
                      .updateAttributes(active.media!, {
                        caption: event.target.value,
                      })
                      .run()
                  }
                />
              </label>
              <button
                className="admin-button subtle"
                onClick={() => editor?.chain().focus().deleteSelection().run()}
              >
                移除媒体
              </button>
            </div>
          )}
          <p className="admin-hint">
            {demo
              ? "示例媒体来自项目内素材，当前试写不会上传文件。"
              : "图片 ≤20 MiB；视频 ≤200 MiB。上传至公共媒体桶后，知道链接的人可访问，即使稿件未发布。"}
          </p>
        </>
      )}
      {snapshot.post?.publishedAt && (
        <div className="admin-publication">
          <span>
            {snapshot.post.publishedRevision === snapshot.post.revision &&
            !snapshot.dirty
              ? "当前版本已发布"
              : "已发布，当前草稿可能有新修改"}
          </span>
          {snapshot.post.publishedRevision === snapshot.post.revision && (
            <Link
              href={`/posts/${snapshot.post.draft.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看阅读页
            </Link>
          )}
          <button
            className="admin-button subtle"
            disabled={controlsDisabled}
            onClick={() => {
              if (
                window.confirm(
                  "撤回后阅读页将不再显示这篇文章，草稿仍保留。继续吗？",
                )
              )
                void act("unpublish");
            }}
          >
            撤回发布
          </button>
        </div>
      )}
      <input
        type="file"
        ref={fileInput}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
