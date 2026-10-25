import type { SupportMessage } from '@/lib/chat';

/**
 * Task 30 (varredura E2E, item 31): anexos da mensagem do chat (imagens enviadas pelo cliente). A API manda URLs
 * pré-assinadas de 15 min só para a equipe (`attachmentUrls`); cada miniatura abre o arquivo numa nova aba.
 */
export function ChatAttachments({ message }: { message: Pick<SupportMessage, 'attachmentUrls' | 'attachmentObjectKeys'> }) {
  const urls = message.attachmentUrls ?? [];
  const pending = (message.attachmentObjectKeys?.length ?? 0) - urls.length;
  if (!urls.length && pending <= 0) return null;
  return (
    <div data-testid="chat-attachments" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer" title={`Abrir anexo ${i + 1}`} aria-label={`Abrir anexo ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL pré-assinada externa (S3), sem otimização do Next. */}
          <img src={url} alt={`Anexo ${i + 1}`} loading="lazy" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', display: 'block' }} />
        </a>
      ))}
      {pending > 0 && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pending === 1 ? '1 anexo indisponível' : `${pending} anexos indisponíveis`}</span>}
    </div>
  );
}
