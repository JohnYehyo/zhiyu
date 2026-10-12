import { AdminShell } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/post-editor";
import { demoPosts } from "@/lib/demo-posts";

export default function DemoPage() {
  const { title, slug, excerpt, category, coverKey, content } = demoPosts[0];
  return (
    <AdminShell title="试写一页手帐" back="/">
      <PostEditor
        demo
        initialDraft={{ title, slug, excerpt, category, coverKey, content }}
      />
    </AdminShell>
  );
}
