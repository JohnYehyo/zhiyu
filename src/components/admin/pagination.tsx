import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageInfo } from "@/lib/admin/queries";

export function Pagination({
  value,
  onChange,
  disabled = false,
}: {
  value: PageInfo;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(value.total / value.pageSize));
  return (
    <nav className="admin-pagination" aria-label="分页">
      <span>
        共 {value.total} 项 · 第 {value.page} / {pages} 页
      </span>
      <div>
        <button
          className="admin-button subtle"
          aria-label="上一页"
          disabled={disabled || value.page <= 1}
          onClick={() => onChange(value.page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="admin-button subtle"
          aria-label="下一页"
          disabled={disabled || value.page >= pages}
          onClick={() => onChange(value.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
