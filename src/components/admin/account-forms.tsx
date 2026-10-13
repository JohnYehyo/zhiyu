"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminRequest } from "@/lib/admin/api";
import {
  parsePassword,
  readEmailCallback,
  resolveEmailCallback,
  type EmailCallback,
} from "@/lib/auth/account";

export function EmailConfirmationForm({
  callback,
}: {
  callback: EmailCallback;
}) {
  const router = useRouter();
  const [link, setLink] = useState(callback);
  const captured = useRef<{
    callback: EmailCallback;
    value: EmailCallback;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // Retain the first browser-only result when StrictMode replays this effect.
    if (!captured.current || captured.current.callback !== callback) {
      const fragment = readEmailCallback(
        new URLSearchParams(window.location.hash.slice(1)),
      );
      captured.current = {
        callback,
        value: resolveEmailCallback(callback, fragment),
      };
    }
    // Fragments never reach the server; remove session credentials from browser history.
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    const value = captured.current.value;
    let active = true;
    queueMicrotask(() => {
      if (active) setLink(value);
    });
    return () => {
      active = false;
    };
  }, [callback]);
  const input = link && "input" in link ? link.input : null;
  const linkError =
    link && "error" in link
      ? link.error === "expired"
        ? "Supabase 已拒绝这封邮件：链接已过期或已使用。请申请新邮件，并打开最新一封。"
        : "这封邮件未能完成验证，或链接不完整。请申请新邮件，并打开最新一封。"
      : "";
  return (
    <form
      className="admin-login"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!input || busy) return;
        setBusy(true);
        setError("");
        try {
          const result = await adminRequest<{ redirectTo: string }>(
            "/api/auth/confirm",
            "POST",
            input,
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
      {input ? (
        <p>继续验证这封邮件，为管理员账号设置密码。</p>
      ) : !link ? (
        <p role="status">正在读取邮件验证结果…</p>
      ) : null}
      {linkError && (
        <p className="admin-error" role="alert">
          {linkError}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {input && (
        <button className="admin-button primary" disabled={busy}>
          {busy ? "正在确认…" : "确认并设置密码"}
        </button>
      )}
      <Link href="/admin/password" className="admin-hint" prefetch={false}>
        申请设置密码邮件
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
        if (busy) return;
        setBusy(true);
        setError("");
        setSent(false);
        const fields = new FormData(event.currentTarget);
        try {
          const result = await adminRequest<{ accepted: boolean }>(
            "/api/auth/recovery",
            "POST",
            { email: String(fields.get("email")) },
          );
          if (!result.accepted)
            throw new Error("邮件申请结果尚未确认，请先查看邮箱。");
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
