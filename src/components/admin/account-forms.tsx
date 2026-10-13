"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { adminRequest } from "@/lib/admin/api";
import { parsePassword, type ConfirmationType } from "@/lib/auth/account";

export function EmailConfirmationForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: ConfirmationType;
}) {
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
          const result = await adminRequest<{ redirectTo: string }>(
            "/api/auth/confirm",
            "POST",
            { tokenHash, type },
          );
          if (result.redirectTo !== "/admin/password")
            throw new Error("确认结果未完成，请申请新邮件。");
          router.replace("/admin/password");
          router.refresh();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "邮件确认失败。");
          setBusy(false);
        }
      }}
    >
      <p>
        {type === "invite"
          ? "确认这封邀请后，为管理员账号设置密码。"
          : "确认这封邮件后，为管理员账号设置新密码。"}
        只有按下按钮才会验证邮件链接。
      </p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button className="admin-button primary" disabled={busy}>
        {busy ? "正在确认…" : "确认并设置密码"}
      </button>
      <Link href="/admin/password" className="admin-hint" prefetch={false}>
        链接失效？申请新邮件
      </Link>
    </form>
  );
}

export function RecoveryRequestForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="admin-login"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const fields = new FormData(event.currentTarget);
        try {
          const client = getBrowserSupabase();
          if (!client) throw new Error("账号服务尚未配置。");
          const result = await client.auth.resetPasswordForEmail(
            String(fields.get("email")).trim(),
            { redirectTo: `${window.location.origin}/auth/confirm` },
          );
          if (result.error)
            throw new Error(
              "邮件暂时无法发送，请稍后重试；也请检查 Supabase 邮件与回跳配置。",
            );
          setSent(true);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "邮件发送失败。");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        首次设置密码或链接过期时，填写预先创建的管理员邮箱，申请一封新的设置密码邮件。
      </p>
      <label>
        邮箱
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {sent && (
        <p className="admin-message" role="status">
          请求已提交。如果邮箱对应已有账号，你会收到设置密码邮件；请打开最新邮件并点击确认。
        </p>
      )}
      <button className="admin-button primary" disabled={busy}>
        {busy ? "正在提交…" : "发送设置密码邮件"}
      </button>
      <Link href="/admin/login" className="admin-hint">
        已有密码，返回登录
      </Link>
    </form>
  );
}

export function PasswordSetupForm() {
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
        const fields = new FormData(event.currentTarget);
        const body = {
          password: String(fields.get("password")),
          confirmation: String(fields.get("confirmation")),
        };
        try {
          parsePassword(body);
          const result = await adminRequest<{ updated: boolean }>(
            "/api/admin/password",
            "POST",
            body,
          );
          if (!result.updated) throw new Error("密码更新结果未确认，请重试。");
          router.replace("/admin");
          router.refresh();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "密码设置失败。");
          setBusy(false);
        }
      }}
    >
      <p>
        为当前已验证的管理员账号设置密码，完成后进入稿件列表。以后可用邮箱和这个密码登录。
      </p>
      <label>
        新密码
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <label>
        再次输入密码
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button className="admin-button primary" disabled={busy}>
        {busy ? "正在设置…" : "设置密码并进入后台"}
      </button>
      <Link href="/admin/login" className="admin-hint">
        返回登录
      </Link>
    </form>
  );
}
