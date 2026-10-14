"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/api";

const defaultCategories = ["日常碎片", "慢慢长大", "出去走走"];

export function CategoryField({ value, onChange, demo = false, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  demo?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const [saved, setSaved] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    if (demo) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    adminRequest<{ categories: string[] }>(
      "/api/admin/categories", "GET", undefined, controller.signal,
    )
      .then(({ categories }) => {
        if (!controller.signal.aborted) {
          setSaved(categories);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      });
  }, [demo]);

  useEffect(() => {
    refresh();
    return () => pending.current?.abort();
  }, [refresh]);

  const categories = [...new Set([...defaultCategories, ...(demo ? [] : saved)])];
  return (
    <div className="admin-category-field">
      <label htmlFor={`${id}-existing`}>
        已有分类
        <select
          id={`${id}-existing`}
          value={categories.includes(value) ? value : ""}
          disabled={disabled}
          onFocus={refresh}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        >
          <option value="" disabled>选择已有分类…</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-name`}>
        分类名称
        <input
          id={`${id}-name`}
          value={value}
          maxLength={60}
          disabled={disabled}
          aria-describedby={`${id}-hint`}
          placeholder="也可以输入新分类"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p id={`${id}-hint`} className="admin-hint">
        {demo
          ? "可选已有分类，或输入新名称。示例模式只保留本页修改。"
          : "可选已有分类，或输入新名称。保存文章后，新分类会自动加入列表。"}
        {!demo && loadFailed && (
          <span role="status"> 已有分类暂时无法读取，仍可直接输入名称。</span>
        )}
      </p>
    </div>
  );
}
