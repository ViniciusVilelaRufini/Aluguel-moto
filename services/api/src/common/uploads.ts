import { randomUUID } from 'node:crypto';
import type { ObjectStorage } from '../ports/object-storage.port';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'application/pdf': 'pdf' };

/** URL `PUT` pré-assinada no formato `PresignedUpload` do contrato. */
export async function presignedUpload(storage: ObjectStorage, bucket: string, prefix: string, contentType: string, expiresInSeconds = 900) {
  const key = `${prefix}/${randomUUID()}.${EXT[contentType] ?? 'bin'}`;
  const signed = await storage.presignPut({ bucket, key, contentType, expiresInSeconds });
  return {
    objectKey: signed.key,
    uploadUrl: signed.url,
    method: 'PUT' as const,
    headers: { 'Content-Type': contentType },
    expiresAt: signed.expiresAt,
  };
}
