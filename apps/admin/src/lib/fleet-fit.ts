interface Pos { lat: number; lng: number; status: string }

/**
 * Pontos usados no enquadramento inicial do mapa: motos com sinal. Moto sem sinal guarda a última posição conhecida
 * (pode estar longe da cidade e abrir o mapa no país inteiro); só entra quando nenhuma tem sinal.
 */
export function fitPoints<T extends Pos>(vehicles: T[]): T[] {
  const live = vehicles.filter((v) => v.status !== 'offline');
  return live.length > 0 ? live : vehicles;
}
