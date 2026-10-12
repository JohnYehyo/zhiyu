import "server-only";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mediaUrl } from "../media";
import { ServiceError, unavailable } from "./errors";
import type { ObjectStorage } from "./upload-service";
export function hasR2Config(): boolean {
  return (
    /^[a-f0-9]{32}$/i.test(process.env.R2_ACCOUNT_ID ?? "") &&
    Boolean(
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      (process.env.R2_KEY_PREFIX ?? "blob") === "blob" &&
      mediaUrl("blob/readiness.jpg"),
    )
  );
}
export function r2Storage(): ObjectStorage {
  if (!hasR2Config()) unavailable();
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
