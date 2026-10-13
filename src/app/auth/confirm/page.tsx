import "../../admin/admin.css";
import { AdminSetup, AdminShell } from "@/components/admin/admin-shell";
import { EmailConfirmationForm } from "@/components/admin/account-forms";
import { hasWriteConfig } from "@/lib/config";
import { readEmailCallback } from "@/lib/auth/account";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "确认管理员邮件",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!hasWriteConfig()) return <AdminSetup />;
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  return (
    <AdminShell title="确认管理员邮件" back="/admin/login">
      <EmailConfirmationForm callback={readEmailCallback(query)} />
    </AdminShell>
  );
}
