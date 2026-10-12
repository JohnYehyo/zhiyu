import "server-only";
import { requireAdmin } from "../auth";
import { ServiceError } from "./errors";
import { assertOrigin } from "./security";
export async function handleAdmin(
  request: Request,
  handler: (user: { userId: string }) => Promise<unknown>,
): Promise<Response> {
  try {
    if (!["GET", "HEAD"].includes(request.method)) assertOrigin(request);
    const user = await requireAdmin();
    return Response.json(await handler(user), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const failure =
      error instanceof ServiceError
        ? error
        : new ServiceError(
            503,
            "SERVICE_UNAVAILABLE",
            "服务暂时不可用，请稍后重试。",
          );
    return Response.json(
      { error: failure.message, code: failure.code },
      {
        status: failure.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new ServiceError(415, "INVALID_CONTENT_TYPE", "请提交 JSON 内容。");
  const max = 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new ServiceError(413, "BODY_TOO_LARGE", "内容过大，请缩短正文。");
  const reader = request.body?.getReader();
  if (!reader)
    throw new ServiceError(400, "INVALID_JSON", "JSON 内容不能为空。");
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new ServiceError(413, "BODY_TOO_LARGE", "内容过大，请缩短正文。");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(400, "INVALID_JSON", "JSON 内容无法解析。");
  } finally {
    reader.releaseLock();
  }
}
