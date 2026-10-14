import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AlbumManager } from "@/components/admin/album-manager";

export const dynamic = "force-dynamic";
export default function AdminAlbumPage() {
  return (
    <AdminGuard>
      <AdminShell title="我的相册">
        <AlbumManager />
      </AdminShell>
    </AdminGuard>
  );
}
