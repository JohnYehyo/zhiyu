import { AdminSetup, AdminShell } from "@/components/admin/admin-shell";
import {
  PasswordSetupForm,
  RecoveryRequestForm,
} from "@/components/admin/account-forms";
import { hasWriteConfig } from "@/lib/config";
import { getAdminSession } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recoverySiteRedirect } from "@/lib/auth/site";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "设置管理员密码",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function PasswordPage() {
  const target = recoverySiteRedirect((await headers()).get("host") ?? "");
  if (target) redirect(target);
  if (!hasWriteConfig()) return <AdminSetup />;
  const session = await getAdminSession();
  return (
    <AdminShell
      title={session ? "设置管理员密码" : "申请设置密码邮件"}
      back="/admin/login"
    >
      {session ? <PasswordSetupForm /> : <RecoveryRequestForm />}
    </AdminShell>
  );
}
