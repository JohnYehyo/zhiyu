import Link from "next/link";
import { ArrowLeft, PenLine, CheckCircle2, CircleAlert } from "lucide-react";
import { writeConfigStatus } from "@/lib/config";

export function AdminShell({
  children,
  title,
  back = "/admin",
  backLabel,
  icon,
}: {
  children: React.ReactNode;
  title: string;
  back?: string;
  backLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <main id="main" className="admin-shell">
      <div className="admin-heading">
        <Link href={back} className="admin-back">
          <ArrowLeft size={16} />
          {backLabel ?? (back === "/" ? "返回首页" : back === "/admin/login" ? "返回登录" : "全部文章")}
        </Link>
        <h1>
          {icon ?? <PenLine size={20} />}
          {title}
        </h1>
      </div>
      {children}
    </main>
  );
}

export function AdminSetup() {
  const status = writeConfigStatus();
  const environment =
    process.env.VERCEL_ENV === "production"
      ? "Production"
      : process.env.VERCEL_ENV === "preview"
        ? "Preview"
        : "本地";
  const commit = /^[a-f0-9]{7,40}$/i.test(
    process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  )
    ? process.env.VERCEL_GIT_COMMIT_SHA!.slice(0, 7)
    : "未提供";
  const checks = [
    {
      key: "url",
      label: "Supabase 地址",
      variables: "NEXT_PUBLIC_zhiyu_SUPABASE_URL",
      hint: "填写 https://项目编号.supabase.co，不是控制台地址。",
    },
    {
      key: "publicKey",
      label: "公共 key",
      variables: "NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_zhiyu_SUPABASE_ANON_KEY",
      hint: "将集成公共变量应用到当前部署环境。",
    },
    {
      key: "serviceKey",
      label: "服务端 key",
      variables: "zhiyu_SUPABASE_SECRET_KEY / zhiyu_SUPABASE_SERVICE_ROLE_KEY",
      hint: "将集成服务端变量应用到当前部署环境。",
    },
    {
      key: "adminUserId",
      label: "管理员账号",
      variables: "ADMIN_USER_ID",
      hint: "单独添加 Supabase Authentication → Users 中的 User UID；不能填邮箱。",
    },
  ] as const;
  return (
    <AdminShell title="开始写一本自己的手帐" back="/">
      <section className="admin-setup">
        <p className="admin-note">
          当前部署：{environment} · 提交 {commit}
        </p>
        <h2>还有配置未就绪</h2>
        <p>下面是当前部署实际读取到的状态，只显示检查结果，不显示配置值。</p>
        <dl className="admin-config-checks">
          {checks.map((item) => (
            <div key={item.key}>
              <dt>
                {item.label}
                <code>{item.variables}</code>
              </dt>
              <dd data-state={status[item.key]}>
                {status[item.key] === "configured" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <CircleAlert size={14} />
                )}
                {status[item.key] === "configured"
                  ? "已提供"
                  : status[item.key] === "missing"
                    ? "未设置"
                    : "格式不正确"}
              </dd>
              {status[item.key] !== "configured" && (
                <p className="admin-hint">{item.hint}</p>
              )}
            </div>
          ))}
        </dl>
        <ol>
          <li>
            在 Vercel 中为实际使用的 Production 或 Preview 环境设置以上变量。
          </li>
          <li>变量修改后重新部署；正式域名需要指向新版 Production 部署。</li>
        </ol>
        <p className="admin-hint">
          这一步只检查登录所需变量，不检查 SQL 或
          R2。通过后再登录维护文章；数据库与上传仍需按接入说明配置。
        </p>
        <Link href="/admin/demo" className="admin-button primary">
          试写本地示例
        </Link>
        <p className="admin-hint">
          示例仅在当前页面内编辑，刷新即重置，不保存或发布到云端。
        </p>
      </section>
    </AdminShell>
  );
}
