import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { PostList } from "@/components/admin/post-list";
import Link from "next/link";
import { Images } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminShell title="我的稿件" back="/">
        <Link href="/admin/album" className="admin-button subtle">
          <Images size={15} />管理相册
        </Link>
        <PostList />
      </AdminShell>
    </AdminGuard>
  );
}
