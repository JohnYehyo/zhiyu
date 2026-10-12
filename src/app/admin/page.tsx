import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { PostList } from "@/components/admin/post-list";

export const dynamic = "force-dynamic";
export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminShell title="我的稿件" back="/">
        <PostList />
      </AdminShell>
    </AdminGuard>
  );
}
