/** Espera (tempo real) até `cond` valer; falha com timeout. Para I/O em processo (WebSocket, TCP, broker falso). */
export async function waitFor(cond: () => boolean, timeoutMs = 3_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > until) throw new Error('waitFor: timeout');
    await new Promise((r) => setTimeout(r, 5));
  }
}
