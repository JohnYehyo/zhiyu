import Link from "next/link";
import "../../admin/admin.css";
import { AdminSetup, AdminShell } from "@/components/admin/admin-shell";
import { EmailConfirmationForm } from "@/components/admin/account-forms";
import { hasWriteConfig } from "@/lib/config";
import { parseConfirmation, type ConfirmationType } from "@/lib/auth/account";

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
  let input: { tokenHash: string; type: ConfirmationType } | null = null;
  try {
    input = parseConfirmation({
      tokenHash: params.token_hash,
      type: params.type,
    });
  } catch {
    /* Display a safe recovery path; never redeem invalid input. */
  }
  return (
    <AdminShell title="确认管理员邮件" back="/admin/login">
      {input ? (
        <EmailConfirmationForm {...input} />
      ) : (
        <section className="admin-login">
          <p role="alert">
            这封邮件的链接不完整或无法使用。请申请新邮件，并打开最新一封。
          </p>
          <Link
            href="/admin/password"
            className="admin-button primary"
            prefetch={false}
          >
            申请设置密码邮件
          </Link>
        </section>
      )}
    </AdminShell>
  );
}
