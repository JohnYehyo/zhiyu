import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { Images } from "lucide-react";
import { AlbumManager } from "@/components/admin/album-manager";

export const dynamic = "force-dynamic";
export default function AdminAlbumPage() {
  return (
    <AdminGuard returnTo="/admin/album">
      <AdminShell title="相册管理" back="/album" backLabel="返回相册" icon={<Images size={20} />}>
        <AlbumManager />
      </AdminShell>
    </AdminGuard>
  );
}
