import { Inject, Injectable } from '@nestjs/common';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { notFound } from '../../common/problem';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { PrismaService } from '../../prisma/prisma.service';

/** Token do link (base64url de 24 bytes = 32 caracteres; o contrato aceita 16–64). */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export interface SharedLocation {
  lat: number;
  lng: number;
  recordedAt: string;
  expiresAt: string;
}

const unavailable = () => notFound('Link de localização inválido, expirado ou encerrado.');

/**
 * SOS — link público de localização compartilhada (`GET /public/location-shares/{token}`). Devolve só a última posição da
 * moto e o horário dela, e só enquanto: o link estiver na validade, o aluguel continuar aberto e o titular mantiver o
 * consentimento de localização (LGPD: revogou → o link para na hora). Qualquer falha → o mesmo 404 (não revela o motivo).
 * Nada é gravado: a posição vem do estado ao vivo (Redis) ou do cadastro da moto.
 */
@Injectable()
export class LocationShareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
  ) {}

  async get(token: string, now = new Date()): Promise<SharedLocation> {
    if (!SHARE_TOKEN_PATTERN.test(token)) throw unavailable();
    const share = await this.prisma.locationShare.findUnique({ where: { token } });
    if (!share || share.expiresAt <= now) throw unavailable();
    const rental = await this.prisma.rental.findUnique({
      where: { id: share.rentalId },
      select: {
        status: true,
        customer: { select: { locationConsent: true } },
        vehicle: { select: { thingName: true, lat: true, lng: true, lastSeenAt: true } },
      },
    });
    if (!rental || !OPEN_RENTAL_STATUSES.includes(rental.status) || !rental.customer.locationConsent) throw unavailable();

    // Estado ao vivo (Redis, atualizado a cada telemetria) quando é mais novo que o cadastro (gravado a cada ~30 s).
    let lat = rental.vehicle.lat;
    let lng = rental.vehicle.lng;
    let at = rental.vehicle.lastSeenAt;
    const live = await this.iot.getLiveState(rental.vehicle.thingName).catch(() => null);
    const liveAt = live ? new Date(live.lastSeenAt) : null;
    if (live && liveAt && Number.isFinite(liveAt.getTime()) && liveAt.getTime() > 0 && (!at || liveAt > at) && !(live.lat === 0 && live.lng === 0)) {
      lat = live.lat;
      lng = live.lng;
      at = liveAt;
    }
    if (!at || (lat === 0 && lng === 0)) throw unavailable();
    return { lat, lng, recordedAt: at.toISOString(), expiresAt: share.expiresAt.toISOString() };
  }
}

/** Cabeçalhos das respostas públicas: nada em cache, o token não vaza por Referer, fora dos buscadores. */
export const PUBLIC_SHARE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

/** Página mínima (pt-BR), sem dependências externas; o script e o estilo só rodam com o `nonce` da resposta. */
export function sharePageHtml(token: string, nonce: string): string {
  // O token já passou pelo padrão base64url: seguro dentro do JSON do script.
  const tokenJson = JSON.stringify(SHARE_TOKEN_PATTERN.test(token) ? token : '');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Localização compartilhada · Volti</title>
<style nonce="${nonce}">
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #111827; --muted: #4b5563; --accent: #0f766e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b1220; --fg: #f3f4f6; --muted: #cbd5e1; --accent: #5eead4; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 1rem/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 32rem; margin: 0 auto; padding: 1.5rem 1rem; }
  h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  p { margin: 0.5rem 0; }
  .muted { color: var(--muted); }
  a { color: var(--accent); font-weight: 600; }
  .links a { display: inline-block; margin: 0.5rem 1rem 0 0; padding: 0.5rem 0; }
</style>
</head>
<body>
<main>
  <h1>Localização compartilhada</h1>
  <div id="status" role="status" aria-live="polite"><p>Carregando a última posição…</p></div>
  <p class="links" id="links" hidden>
    <a id="osm" rel="noopener noreferrer" target="_blank">Abrir no mapa (OpenStreetMap)</a>
    <a id="gmaps" rel="noopener noreferrer" target="_blank">Abrir no Google Maps</a>
  </p>
  <p class="muted">A posição se atualiza sozinha a cada 15 segundos enquanto o compartilhamento estiver ativo.</p>
</main>
<script nonce="${nonce}">
(function () {
  var token = ${tokenJson};
  var statusEl = document.getElementById('status');
  var links = document.getElementById('links');
  var fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  var timer;
  function text(lines) {
    statusEl.textContent = '';
    lines.forEach(function (l) { var p = document.createElement('p'); p.textContent = l; statusEl.appendChild(p); });
  }
  function stop(msg) { if (timer) clearInterval(timer); links.hidden = true; text([msg]); }
  function load() {
    if (!token) return stop('Este link não é válido.');
    fetch('../public/location-shares/' + encodeURIComponent(token), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) {
        if (r.status === 404) return stop('Este link expirou ou o aluguel terminou. A localização não está mais disponível.');
        if (r.status === 429) return text(['Muitas consultas seguidas. Tentaremos de novo em instantes.']);
        if (!r.ok) throw new Error(String(r.status));
        return r.json().then(function (d) {
          var lat = Number(d.lat).toFixed(6), lng = Number(d.lng).toFixed(6);
          text(['Última posição: ' + lat + ', ' + lng, 'Atualizada em ' + fmt.format(new Date(d.recordedAt)) + ' (horário de Brasília).', 'Link válido até ' + fmt.format(new Date(d.expiresAt)) + '.']);
          document.getElementById('osm').href = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=17/' + lat + '/' + lng;
          document.getElementById('gmaps').href = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
          links.hidden = false;
        });
      })
      .catch(function () { text(['Não foi possível atualizar agora. Tentaremos de novo em instantes.']); });
  }
  load();
  timer = setInterval(load, 15000);
})();
</script>
</body>
</html>
`;
}
