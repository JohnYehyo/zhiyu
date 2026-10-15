import { adminLoginUrl } from "@/lib/auth/admin-destination";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { hasWriteConfig } from "@/lib/config";
import { AdminSetup } from "./admin-shell";

export async function AdminGuard({ children, returnTo = "/admin" }: { children: React.ReactNode; returnTo?: string }) {
  if (!hasWriteConfig()) return <AdminSetup />;
  if (!(await getAdminSession())) redirect(adminLoginUrl(returnTo));
  return children;
}
