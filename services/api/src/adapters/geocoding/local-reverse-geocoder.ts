import type { ReverseGeocoder } from '../../ports/reverse-geocoder.port';

/**
 * Geocodificador reverso offline para desenvolvimento (`GEOCODER_MODE=local`): trechos de ruas da área de operação do
 * seed (Pinheiros, Vila Madalena, Jardins e Av. Paulista) com numeração interpolada ao longo do trecho. Coordenadas e
 * numeração são aproximadas: servem para a UI mostrar um endereço plausível, não para navegação.
 */
interface Segment {
  street: string;
  district: string;
  /** [lat, lng] do início (menor número) e do fim. */
  from: [number, number];
  to: [number, number];
  numbers: [number, number];
}

export const SAO_PAULO_STREETS: Segment[] = [
  { street: 'Av. Paulista', district: 'Bela Vista', from: [-23.5717, -46.6447], to: [-23.5557, -46.6623], numbers: [1, 2700] },
  { street: 'Al. Santos', district: 'Jardim Paulista', from: [-23.5737, -46.6470], to: [-23.5590, -46.6640], numbers: [1, 2400] },
  { street: 'R. da Consolação', district: 'Consolação', from: [-23.5460, -46.6450], to: [-23.5580, -46.6610], numbers: [1000, 3700] },
  { street: 'R. Augusta', district: 'Consolação', from: [-23.5500, -46.6510], to: [-23.5640, -46.6640], numbers: [1, 3000] },
  { street: 'R. Haddock Lobo', district: 'Cerqueira César', from: [-23.5555, -46.6600], to: [-23.5680, -46.6700], numbers: [1, 1800] },
  { street: 'R. Oscar Freire', district: 'Jardim Paulista', from: [-23.5700, -46.6630], to: [-23.5585, -46.6790], numbers: [1, 2600] },
  { street: 'Av. Rebouças', district: 'Pinheiros', from: [-23.5555, -46.6683], to: [-23.5665, -46.6900], numbers: [1, 3970] },
  { street: 'Av. Henrique Schaumann', district: 'Pinheiros', from: [-23.5555, -46.6720], to: [-23.5620, -46.6840], numbers: [1, 1000] },
  { street: 'R. Teodoro Sampaio', district: 'Pinheiros', from: [-23.5547, -46.6720], to: [-23.5670, -46.6935], numbers: [1, 2600] },
  { street: 'R. Cardeal Arcoverde', district: 'Pinheiros', from: [-23.5530, -46.6760], to: [-23.5665, -46.6965], numbers: [1, 3000] },
  { street: 'R. dos Pinheiros', district: 'Pinheiros', from: [-23.5605, -46.6780], to: [-23.5730, -46.6890], numbers: [1, 1500] },
  { street: 'R. Joaquim Antunes', district: 'Pinheiros', from: [-23.5620, -46.6790], to: [-23.5720, -46.6760], numbers: [1, 900] },
  { street: 'R. Cristiano Viana', district: 'Pinheiros', from: [-23.5560, -46.6790], to: [-23.5640, -46.6720], numbers: [1, 1000] },
  { street: 'Av. Brig. Faria Lima', district: 'Pinheiros', from: [-23.5662, -46.6942], to: [-23.5772, -46.6872], numbers: [1000, 2200] },
  { street: 'Largo da Batata', district: 'Pinheiros', from: [-23.5660, -46.6950], to: [-23.5675, -46.6920], numbers: [1, 100] },
  { street: 'R. Fradique Coutinho', district: 'Pinheiros', from: [-23.5545, -46.6905], to: [-23.5690, -46.6800], numbers: [1, 2000] },
  { street: 'R. Mourato Coelho', district: 'Pinheiros', from: [-23.5555, -46.6925], to: [-23.5645, -46.6820], numbers: [1, 1500] },
  { street: 'Av. Pedroso de Morais', district: 'Pinheiros', from: [-23.5640, -46.6905], to: [-23.5560, -46.7060], numbers: [1, 2400] },
  { street: 'R. Aspicuelta', district: 'Vila Madalena', from: [-23.5545, -46.6905], to: [-23.5585, -46.6855], numbers: [1, 700] },
  { street: 'R. Wisard', district: 'Vila Madalena', from: [-23.5530, -46.6895], to: [-23.5585, -46.6835], numbers: [1, 600] },
  { street: 'R. Girassol', district: 'Vila Madalena', from: [-23.5520, -46.6880], to: [-23.5590, -46.6815], numbers: [1, 1100] },
  { street: 'R. Harmonia', district: 'Vila Madalena', from: [-23.5510, -46.6930], to: [-23.5580, -46.6860], numbers: [1, 1300] },
  { street: 'R. Purpurina', district: 'Vila Madalena', from: [-23.5495, -46.6895], to: [-23.5555, -46.6830], numbers: [1, 600] },
  { street: 'R. Heitor Penteado', district: 'Sumarezinho', from: [-23.5440, -46.6830], to: [-23.5470, -46.6960], numbers: [1, 2000] },
  { street: 'Av. Sumaré', district: 'Perdizes', from: [-23.5400, -46.6700], to: [-23.5480, -46.6830], numbers: [1, 1800] },
  { street: 'R. Alves Guimarães', district: 'Pinheiros', from: [-23.5555, -46.6810], to: [-23.5620, -46.6740], numbers: [1, 1500] },
  { street: 'Av. Eusébio Matoso', district: 'Pinheiros', from: [-23.5680, -46.6935], to: [-23.5780, -46.6990], numbers: [1, 1400] },
];

/** Distância acima da qual o endereço vira só bairro e cidade. */
export const MAX_STREET_DISTANCE_M = 300;

const K_LAT = 111_320;

/** Projeção do ponto no segmento (plano local em metros): distância e fração ao longo do trecho. */
function project(lat: number, lng: number, s: Segment): { distM: number; t: number } {
  const kLng = K_LAT * Math.cos((lat * Math.PI) / 180);
  const ax = s.from[1] * kLng;
  const ay = s.from[0] * K_LAT;
  const bx = s.to[1] * kLng;
  const by = s.to[0] * K_LAT;
  const px = lng * kLng;
  const py = lat * K_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { distM: Math.hypot(px - cx, py - cy), t };
}

export function nearestStreetAddress(lat: number, lng: number, streets: Segment[] = SAO_PAULO_STREETS): string | null {
  let best: { s: Segment; distM: number; t: number } | null = null;
  for (const s of streets) {
    const p = project(lat, lng, s);
    if (!best || p.distM < best.distM) best = { s, ...p };
  }
  if (!best) return null;
  if (best.distM > 5_000) return null;
  if (best.distM > MAX_STREET_DISTANCE_M) return `${best.s.district}, São Paulo`;
  const [n0, n1] = best.s.numbers;
  const number = Math.max(n0, Math.round((n0 + best.t * (n1 - n0)) / 10) * 10);
  return `${best.s.street}, ${number} · ${best.s.district}, São Paulo`;
}

export class LocalReverseGeocoder implements ReverseGeocoder {
  async reverse(lat: number, lng: number): Promise<string | null> {
    return nearestStreetAddress(lat, lng);
  }
}
