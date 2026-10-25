import type { LatLng } from './geo';

/** Área de operação do seed (retângulo Pinheiros, Vila Madalena e Paulista). */
export const OPERATION_AREA = { minLat: -23.58, maxLat: -23.539, minLng: -46.708, maxLng: -46.644 };

export interface Route {
  name: string;
  /** Laço fechado: depois do último ponto volta ao primeiro. */
  points: LatLng[];
}

/**
 * Rotas em laço dentro da área de operação. Algumas passam pelas zonas do seed:
 * calçadão da Teodoro Sampaio (6 km/h), ciclovia da Faria Lima (20 km/h) e zonas de devolução.
 */
export const ROUTES: Route[] = [
  {
    name: 'Pinheiros — Largo da Batata, Teodoro Sampaio, Benedito Calixto',
    points: [
      [-23.5667, -46.6935], // Largo da Batata
      [-23.5648, -46.6890],
      [-23.5630, -46.6850], // calçadão da Teodoro Sampaio
      [-23.5600, -46.6830],
      [-23.5585, -46.6814], // Praça Benedito Calixto
      [-23.5620, -46.6800],
      [-23.5661, -46.6845], // Metrô Fradique Coutinho
      [-23.5672, -46.6900],
    ],
  },
  {
    name: 'Vila Madalena — Metrô, Harmonia, Aspicuelta',
    points: [
      [-23.5465, -46.6905], // Metrô Vila Madalena
      [-23.5500, -46.6880],
      [-23.5530, -46.6890],
      [-23.5560, -46.6900],
      [-23.5545, -46.6935],
      [-23.5505, -46.6950],
      [-23.5475, -46.6935],
    ],
  },
  {
    name: 'Paulista — MASP, Consolação, Brigadeiro',
    points: [
      [-23.5614, -46.6559], // MASP
      [-23.5596, -46.6585],
      [-23.5578, -46.6608], // Metrô Consolação
      [-23.5610, -46.6625],
      [-23.5650, -46.6540],
      [-23.5680, -46.6480], // Paulista x Brigadeiro
      [-23.5655, -46.6505],
    ],
  },
  {
    name: 'Faria Lima — ciclovia',
    points: [
      [-23.5672, -46.6928],
      [-23.5710, -46.6915],
      [-23.5760, -46.6895],
      [-23.5768, -46.6925],
      [-23.5720, -46.6935],
      [-23.5675, -46.6945],
    ],
  },
  {
    name: 'Pinheiros → Paulista pela Oscar Freire',
    points: [
      [-23.5667, -46.6935],
      [-23.5640, -46.6800],
      [-23.5640, -46.6720], // Rebouças x Oscar Freire
      [-23.5615, -46.6660],
      [-23.5578, -46.6608],
      [-23.5614, -46.6559],
      [-23.5655, -46.6640],
      [-23.5665, -46.6780],
    ],
  },
];

export function insideOperationArea([lat, lng]: LatLng): boolean {
  const a = OPERATION_AREA;
  return lat > a.minLat && lat < a.maxLat && lng > a.minLng && lng < a.maxLng;
}

/** Lado do laço local (graus, ~220 m): usado pelas motos da frota real, que ficam onde estão cadastradas. */
const LOCAL_LOOP_DEG = 0.002;

/**
 * Laço curto (quadrado de ~220 m) que começa exatamente em `start`: a moto parada fica no ponto de cadastro (galpão ou
 * rua); se o piloto simulado andar, roda perto dali em vez de "saltar" para as rotas de Pinheiros.
 */
export function localLoop(start: LatLng): Route {
  const [lat, lng] = start;
  return {
    name: 'laço local',
    points: [
      [lat, lng],
      [lat + LOCAL_LOOP_DEG, lng],
      [lat + LOCAL_LOOP_DEG, lng + LOCAL_LOOP_DEG],
      [lat, lng + LOCAL_LOOP_DEG],
    ],
  };
}
