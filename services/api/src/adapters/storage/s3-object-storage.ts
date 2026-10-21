import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from '../../config/env';
import type { ObjectStorage } from '../../ports/object-storage.port';

/**
 * ObjectStorage sobre S3. `STORAGE_MODE=local` aponta para o MinIO do compose (`S3_ENDPOINT`, `forcePathStyle`);
 * `STORAGE_MODE=s3` usa o S3 real (credenciais da task role do ECS).
 */
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  /** Cliente usado só para assinar URLs com o host que o app/navegador alcança (ex.: localhost:9000). */
  private readonly signer: S3Client;

  constructor(cfg: AppConfig) {
    const local = cfg.storageMode === 'local';
    const credentials =
      cfg.s3.accessKey && cfg.s3.secretKey ? { accessKeyId: cfg.s3.accessKey, secretAccessKey: cfg.s3.secretKey } : undefined;
    const base = { region: cfg.s3.region, credentials, forcePathStyle: local || !!cfg.s3.endpoint };
    this.client = new S3Client({ ...base, endpoint: cfg.s3.endpoint });
    this.signer = new S3Client({ ...base, endpoint: cfg.s3.publicEndpoint ?? cfg.s3.endpoint });
  }

  async presignPut(input: { bucket: string; key: string; contentType: string; expiresInSeconds?: number }) {
    const expiresIn = input.expiresInSeconds ?? 900;
    const url = await getSignedUrl(
      this.signer,
      new PutObjectCommand({ Bucket: input.bucket, Key: input.key, ContentType: input.contentType }),
      { expiresIn },
    );
    return { url, key: input.key, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async presignGet(input: { bucket: string; key: string; expiresInSeconds?: number }) {
    const expiresIn = input.expiresInSeconds ?? 900;
    const url = await getSignedUrl(this.signer, new GetObjectCommand({ Bucket: input.bucket, Key: input.key }), { expiresIn });
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async putObject(input: { bucket: string; key: string; body: Buffer; contentType: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: input.bucket, Key: input.key, Body: input.body, ContentType: input.contentType }),
    );
  }

  async deleteObject(input: { bucket: string; key: string }): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }));
  }
}
