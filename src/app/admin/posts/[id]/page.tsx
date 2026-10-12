import { AdminGuard } from "@/components/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { EditLoader } from "@/components/admin/edit-loader";

export const dynamic = "force-dynamic";
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminGuard>
      <AdminShell title="编辑日记">
        <EditLoader id={id} />
      </AdminShell>
    </AdminGuard>
  );
}
