interface Pos { lat: number; lng: number; status: string }

/**
 * Pontos usados no enquadramento inicial do mapa: motos com sinal. Moto sem sinal guarda a última posição conhecida
 * (pode estar longe da cidade e abrir o mapa no país inteiro); só entra quando nenhuma tem sinal.
 */
export function fitPoints<T extends Pos>(vehicles: T[]): T[] {
  // P3: posição nula (0,0: nunca teve GPS) ou inválida abriria o mapa no meio do Atlântico.
  const placed = vehicles.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0));
  const live = placed.filter((v) => v.status !== 'offline');
  return live.length > 0 ? live : placed;
}
