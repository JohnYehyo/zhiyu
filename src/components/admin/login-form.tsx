"use client";

import { adminDestination } from "@/lib/auth/admin-destination";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminRequest } from "@/lib/admin/api";

export function LoginForm({ returnTo = "/admin" }: { returnTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="admin-login"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const fields = new FormData(event.currentTarget);
          const result = await adminRequest<{ redirectTo: string }>(
            "/api/auth/login",
            "POST",
            {
              email: String(fields.get("email")),
              password: String(fields.get("password")),
            },
          );
          if (result.redirectTo !== "/admin")
            throw new Error("登录结果尚未确认，请重试。");
          router.replace(adminDestination(returnTo));
          router.refresh();
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "登录失败，请重试。",
          );
          setBusy(false);
        }
      }}
    >
      <p>使用预先创建的管理员账号。本站不开放注册。</p>
      <label>
        邮箱
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        密码
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <button className="admin-button primary" disabled={busy}>
        {busy ? "正在登录…" : "登录"}
      </button>
      <Link href="/admin/password" className="admin-hint" prefetch={false}>
        首次设置密码 / 忘记密码
      </Link>
    </form>
  );
}
