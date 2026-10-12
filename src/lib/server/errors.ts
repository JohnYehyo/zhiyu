export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function unavailable(): never {
  throw new ServiceError(
    503,
    "NOT_CONFIGURED",
    "服务尚未配置，请使用本地预览。",
  );
}
