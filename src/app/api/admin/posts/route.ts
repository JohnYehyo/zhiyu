import { handleAdmin, readJson } from "@/lib/server/http";
import { createDraft, listDrafts } from "@/lib/server/repository";
import { validateDraft } from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({
    posts: await listDrafts(userId),
  }));
}
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({
    post: await createDraft(userId, validateDraft(await readJson(request))),
  }));
}
