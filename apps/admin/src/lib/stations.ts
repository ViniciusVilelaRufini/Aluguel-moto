import qrcode from 'qrcode-generator';
import type { S } from './types';

type Station = S<'SwapStationAdmin'>;

/** `station-<uuid>` em minúsculas: o mesmo padrão de `SwapStationInput.thingName` no contrato. */
export const STATION_THING = /^station-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const OPEN_24H_TEXT = 'Todos os dias, 24 h';
export const MAX_SLOTS = 200;

export interface StationDraft {
  id?: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  openingHours: string;
  open24h: boolean;
  totalSlots: string;
  /** Vazio = padrão `station-{id}`. */
  thingName: string;
  active: boolean;
  /** Baterias que ocupam vagas hoje (o maior entre carregadas e registradas na estação); 0 numa estação nova. */
  occupied: number;
}

export type StationErrors = Partial<Record<'name' | 'address' | 'point' | 'openingHours' | 'totalSlots' | 'thingName', string>>;

export function emptyStationDraft(): StationDraft {
  return { name: '', address: '', lat: null, lng: null, openingHours: '', open24h: false, totalSlots: '8', thingName: '', active: true, occupied: 0 };
}

/** Baterias que ocupam vagas: mesma regra da API (`slots-below-stock`). */
export const occupiedSlots = (s: Pick<Station, 'availableBatteries' | 'batteriesInStation'>) => Math.max(s.availableBatteries, s.batteriesInStation);

export function draftFromStation(s: Station): StationDraft {
  return {
    id: s.id, name: s.name, address: s.address, lat: s.lat, lng: s.lng, openingHours: s.openingHours, open24h: !!s.open24h,
    totalSlots: String(s.totalSlots), thingName: s.thingName === `station-${s.id}` ? '' : s.thingName, active: s.active, occupied: occupiedSlots(s),
  };
}

export function validateStation(d: StationDraft): StationErrors {
  const e: StationErrors = {};
  if (!d.name.trim()) e.name = 'Informe o nome da estação';
  else if (d.name.trim().length > 120) e.name = 'Até 120 caracteres';
  if (!d.address.trim()) e.address = 'Informe o endereço';
  else if (d.address.trim().length > 300) e.address = 'Até 300 caracteres';
  if (d.lat == null || d.lng == null) e.point = 'Clique no mapa para marcar o ponto da estação';
  else if (Math.abs(d.lat) > 90 || Math.abs(d.lng) > 180) e.point = 'Posição inválida';
  if (!d.open24h && !d.openingHours.trim()) e.openingHours = 'Informe o horário (ex.: Seg a sáb, 7h às 22h) ou marque 24 horas';
  else if (!d.open24h && d.openingHours.trim() === OPEN_24H_TEXT) e.openingHours = 'A estação deixou de ser 24 h: informe o novo horário';
  else if (d.openingHours.trim().length > 120) e.openingHours = 'Até 120 caracteres';
  const slots = d.totalSlots.trim();
  if (!/^\d+$/.test(slots) || Number(slots) < 1 || Number(slots) > MAX_SLOTS) e.totalSlots = `Entre 1 e ${MAX_SLOTS} vagas`;
  else if (Number(slots) < d.occupied) e.totalSlots = `A estação tem ${d.occupied} bateria(s): as vagas não podem ficar abaixo disso`;
  const thing = d.thingName.trim();
  if (thing && !STATION_THING.test(thing)) e.thingName = 'Use station-<uuid> em minúsculas (ou deixe vazio para o padrão)';
  return e;
}

/** Desmarcar 24 h com o texto padrão de 24 h limpa o horário (senão a estação continuaria aberta o dia todo no app). */
export function toggle24h(d: StationDraft, on: boolean): Partial<StationDraft> {
  return { open24h: on, ...(!on && d.openingHours.trim() === OPEN_24H_TEXT ? { openingHours: '' } : {}) };
}

function fields(d: StationDraft) {
  const hours = d.openingHours.trim();
  return {
    name: d.name.trim(),
    address: d.address.trim(),
    lat: d.lat as number,
    lng: d.lng as number,
    open24h: d.open24h,
    // 24 h sem texto: a API grava "Todos os dias, 24 h".
    ...(hours ? { openingHours: hours } : {}),
    totalSlots: Number(d.totalSlots.trim()),
  };
}

/** `POST /swap-stations`: thing vazia = padrão da API (`station-{id}`). */
export function stationCreateBody(d: StationDraft): S<'SwapStationInput'> {
  const thing = d.thingName.trim();
  return { ...fields(d), ...(thing ? { thingName: thing } : {}), active: d.active };
}

/**
 * `PATCH /swap-stations/{id}`: só os campos do formulário. `active` muda só por Desativar/Reativar. Thing vazia volta ao
 * padrão `station-{id}` (enviada explicitamente, porque o contrato não usa `null`).
 */
export function stationUpdateBody(d: StationDraft): S<'SwapStationUpdate'> {
  const thing = d.thingName.trim() || (d.id ? `station-${d.id}` : '');
  return { ...fields(d), ...(thing ? { thingName: thing } : {}) };
}

// ───────────── QR fixo da estação ─────────────

export interface QrMatrix { size: number; path: string }

/**
 * Matriz do QR (correção M, versão automática) como um único `path` SVG, uma célula por módulo. Sem margem: quem desenha
 * acrescenta a zona de silêncio (4 módulos).
 */
export function qrMatrix(code: string): QrMatrix {
  const qr = qrcode(0, 'M');
  qr.addData(code, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
  }
  return { size, path };
}

export const QR_QUIET = 4;

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** SVG autônomo do QR (para baixar ou imprimir), preto no branco, com zona de silêncio. */
export function qrSvg(code: string, px = 512): string {
  const { size, path } = qrMatrix(code);
  const total = size + QR_QUIET * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-QR_QUIET} ${-QR_QUIET} ${total} ${total}" shape-rendering="crispEdges">`
    + `<rect x="${-QR_QUIET}" y="${-QR_QUIET}" width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

/** Nome do arquivo baixado: `qr-estacao-<nome>.svg`, sem acentos nem símbolos. */
export function qrFileName(name: string): string {
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `qr-estacao-${slug || 'sem-nome'}.svg`;
}

/** Página de impressão do adesivo: nome, endereço e o QR (textos escapados; sem script). */
export function qrPrintHtml(station: { name: string; address: string }, code: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR · ${escapeXml(station.name)}</title>`
    + '<style>@page{margin:16mm}body{font-family:system-ui,sans-serif;text-align:center;color:#000}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 16px;font-size:14px}svg{width:90mm;height:90mm}small{display:block;margin-top:12px;font-size:12px}</style>'
    + `</head><body><h1>${escapeXml(station.name)}</h1><p>${escapeXml(station.address)}</p>${qrSvg(code)}`
    + '<small>Volti · Troca de bateria: abra o app e escaneie este código</small></body></html>';
}

// ───────────── mapa ─────────────

export const STATION_SRC = 'swap-stations';
export const STATION_LAYER = 'swap-stations-dot';

/** Estações como pontos (inativa e sem carregada nas propriedades, para a cor do ponto). */
export function stationFeatures(stations: Pick<Station, 'id' | 'name' | 'lat' | 'lng' | 'active' | 'availableBatteries'>[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { id: s.id, name: s.name, active: s.active, empty: s.availableBatteries === 0 },
    })),
  };
}

/** Uma linha da lista: "9/12 carregadas · 24 h". */
export function stationSummary(s: Pick<Station, 'availableBatteries' | 'totalSlots' | 'open24h' | 'openingHours'>): string {
  return `${s.availableBatteries}/${s.totalSlots} carregadas · ${s.open24h ? '24 h' : s.openingHours}`;
}
