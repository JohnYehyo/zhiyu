import { handleAdmin, readJson } from "@/lib/server/http";
import { createDraft, listDraftPage } from "@/lib/server/repository";
import { parsePostQuery } from "@/lib/admin/queries";
import { validateDraft } from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, async ({ userId }) =>
    listDraftPage(userId, parsePostQuery(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request) {
  return handleAdmin(request, async ({ userId }) => ({
    post: await createDraft(userId, validateDraft(await readJson(request))),
  }));
}
