import "server-only";
import { hasWriteConfig } from "../config";
import { ServiceError, unavailable } from "./errors";
import { assertOrigin } from "./security";

export async function handleAuth(
  request: Request,
  handler: () => Promise<unknown>,
): Promise<Response> {
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    assertOrigin(request);
    if (!hasWriteConfig()) unavailable();
    return Response.json(await handler(), { headers });
  } catch (cause) {
    const failure =
      cause instanceof ServiceError
        ? cause
        : new ServiceError(
            503,
            "AUTH_UNAVAILABLE",
            "账号服务暂时不可用，请稍后重试。",
          );
    return Response.json(
      { error: failure.message, code: failure.code },
      { status: failure.status, headers },
    );
  }
}
