import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { PostList } from "@/components/admin/post-list";

export const dynamic = "force-dynamic";
export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminShell title="文章管理" back="/archive" backLabel="返回记录">
        <PostList />
      </AdminShell>
    </AdminGuard>
  );
}
