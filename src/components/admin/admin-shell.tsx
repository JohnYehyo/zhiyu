import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";

export function AdminShell({
  children,
  title,
  back = "/admin",
}: {
  children: React.ReactNode;
  title: string;
  back?: string;
}) {
  return (
    <main id="main" className="admin-shell">
      <div className="admin-heading">
        <Link href={back} className="admin-back">
          <ArrowLeft size={16} />
          {back === "/" ? "返回日记" : "全部稿件"}
        </Link>
        <h1>
          <PenLine size={20} />
          {title}
        </h1>
      </div>
      {children}
    </main>
  );
}

export function AdminSetup() {
  return (
    <AdminShell title="开始写一本自己的手帐" back="/">
      <section className="admin-setup">
        <p className="admin-note">真实后台尚未配置</p>
        <h2>先把账号与存储连接好</h2>
        <p>
          管理员登录需要 Supabase 公共配置、服务端密钥与
          ADMIN_USER_ID。当前真实写入已关闭；此页面不会显示配置值。
        </p>
        <ol>
          <li>按仓库中的 docs/cloud-setup.md 应用数据库迁移。</li>
          <li>创建管理员账号，设置环境变量后重新构建。</li>
          <li>上传图片和视频前，为 R2 配置凭据与网站 CORS。</li>
        </ol>
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
