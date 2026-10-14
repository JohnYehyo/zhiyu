import "server-only";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mediaUrl } from "../media";
import { ServiceError } from "./errors";
import type { ObjectStorage } from "./upload-service";
type ConfigFieldStatus = "configured" | "missing" | "invalid";

/** Configuration validation only; does not verify credentials or contact R2. */
export function getR2ConfigStatus() {
  const required = (value: string | undefined, valid = true): ConfigFieldStatus =>
    !value?.trim() ? "missing" : valid ? "configured" : "invalid";
  const fields = {
    R2_ACCOUNT_ID: required(
      process.env.R2_ACCOUNT_ID,
      /^[a-f0-9]{32}$/i.test(process.env.R2_ACCOUNT_ID ?? ""),
    ),
    R2_ACCESS_KEY_ID: required(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: required(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: required(process.env.R2_BUCKET_NAME),
    R2_KEY_PREFIX: (
      (process.env.R2_KEY_PREFIX ?? "blob") === "blob" ? "configured" : "invalid"
    ) as ConfigFieldStatus,
    NEXT_PUBLIC_MEDIA_BASE_URL: required(
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
      Boolean(mediaUrl("blob/readiness.jpg")),
    ),
  };
  const missing = Object.keys(fields).filter(
    (field) => fields[field as keyof typeof fields] === "missing",
  );
  const invalid = Object.keys(fields).filter(
    (field) => fields[field as keyof typeof fields] === "invalid",
  );
  return {
    configured: missing.length === 0 && invalid.length === 0,
    fields,
    missing,
    invalid,
  };
}
export function hasR2Config(): boolean {
  return getR2ConfigStatus().configured;
}
export function r2Storage(): ObjectStorage {
  const status = getR2ConfigStatus();
  if (!status.configured) {
    const details = [
      status.missing.length ? `缺少配置：${status.missing.join("、")}。` : "",
      status.invalid.length ? `配置无效：${status.invalid.join("、")}。` : "",
    ].join("");
    throw new ServiceError(
      503,
      "STORAGE_NOT_CONFIGURED",
      `云端图片和视频存储尚未配置完整。${details}请完成存储配置后重试。`,
    );
  }
  const client = new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = process.env.R2_BUCKET_NAME!;
  return {
    async sign(Key, ContentType, ContentLength) {
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket,
          Key,
          ContentType,
          ContentLength,
          IfNoneMatch: "*",
        }),
        {
          expiresIn: 300,
          signableHeaders: new Set([
            "content-type",
            "content-length",
            "if-none-match",
          ]),
        },
      );
    },
    async head(Key) {
      try {
        const value = await client.send(new HeadObjectCommand({ Bucket, Key }));
        return {
          contentType: value.ContentType ?? "",
          size: value.ContentLength ?? -1,
        };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "$metadata" in error &&
          (error.$metadata as { httpStatusCode?: number }).httpStatusCode ===
            404
        )
          return null;
        throw new ServiceError(
          503,
          "STORAGE_UNAVAILABLE",
          "暂时无法验证媒体，请稍后重试。",
        );
      }
    },
  };
}
