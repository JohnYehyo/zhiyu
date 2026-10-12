import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/post-editor";
import { defaultSlug } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export default function NewPostPage() {
  return (
    <AdminGuard>
      <AdminShell title="写一篇日记">
        <PostEditor
          initialDraft={{
            title: "",
            slug: defaultSlug(),
            category: "日常碎片",
            excerpt: "",
            coverKey: "",
            content: { type: "doc", content: [{ type: "paragraph" }] },
          }}
        />
      </AdminShell>
    </AdminGuard>
  );
}
