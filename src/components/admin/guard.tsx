import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { hasWriteConfig } from "@/lib/config";
import { AdminSetup } from "./admin-shell";

export async function AdminGuard({ children }: { children: React.ReactNode }) {
  if (!hasWriteConfig()) return <AdminSetup />;
  if (!(await getAdminSession())) redirect("/admin/login");
  return children;
}
