import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { hasWriteConfig } from "@/lib/config";
import { AdminSetup, AdminShell } from "@/components/admin/admin-shell";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (!hasWriteConfig()) return <AdminSetup />;
  if (await getAdminSession()) redirect("/admin");
  return (
    <AdminShell title="管理员登录" back="/">
      <LoginForm />
    </AdminShell>
  );
}
