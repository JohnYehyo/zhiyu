import { handleAdmin } from "@/lib/server/http";
import { listCategories } from "@/lib/server/category-repository";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({
    categories: await listCategories(userId),
  }));
}
