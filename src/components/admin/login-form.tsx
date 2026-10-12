"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="admin-login"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const fields = new FormData(event.currentTarget);
          const client = getBrowserSupabase();
          if (!client) throw new Error("登录配置尚未就绪。");
          const result = await client.auth.signInWithPassword({
            email: String(fields.get("email")),
            password: String(fields.get("password")),
          });
          if (result.error)
            throw new Error("邮箱或密码不正确，或登录服务暂不可用。");
          // The server decides authorization; signing in alone grants no write access.
          const response = await fetch("/api/admin/posts", {
            cache: "no-store",
          });
          if (!response.ok) {
            await client.auth.signOut();
            throw new Error(
              response.status === 403
                ? "该账号没有管理员权限。"
                : "后台暂不可用，请检查配置后重试。",
            );
          }
          router.replace("/admin");
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
    </form>
  );
}
