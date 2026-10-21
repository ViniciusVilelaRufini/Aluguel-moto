// services/api/src/ports/object-storage.port.ts
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
export interface ObjectStorage {
  presignPut(input: { bucket: string; key: string; contentType: string; expiresInSeconds?: number }): Promise<{ url: string; key: string; expiresAt: string }>;
  presignGet(input: { bucket: string; key: string; expiresInSeconds?: number }): Promise<{ url: string; expiresAt: string }>;
  putObject(input: { bucket: string; key: string; body: Buffer; contentType: string }): Promise<void>;
  deleteObject(input: { bucket: string; key: string }): Promise<void>;
}
