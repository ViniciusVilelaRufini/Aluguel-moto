import { api, ApiError, unwrap } from './api';
import { validatePhoto, isCatalogKey, type PhotoType } from './catalog';

/**
 * Foto do modelo: pede a URL pré-assinada (`POST /vehicle-models/uploads`), envia o arquivo direto ao
 * bucket de catálogo (S3/MinIO) com os cabeçalhos devolvidos e retorna a `objectKey` (`catalog/...`)
 * para o `PATCH /vehicle-models/{id}` ou o cadastro. O arquivo não passa pela API.
 */
export async function uploadModelPhoto(file: File): Promise<string> {
  const invalid = validatePhoto(file);
  if (invalid) throw new Error(invalid);
  const up = await unwrap(api.POST('/vehicle-models/uploads', { body: { contentType: file.type as PhotoType } }));
  if (!isCatalogKey(up.objectKey)) throw new Error('Resposta de upload inesperada');
  const res = await fetch(up.uploadUrl, { method: up.method, headers: up.headers, body: file });
  if (!res.ok) throw new ApiError(res.status, `Falha ao enviar a foto (${res.status})`);
  return up.objectKey;
}
