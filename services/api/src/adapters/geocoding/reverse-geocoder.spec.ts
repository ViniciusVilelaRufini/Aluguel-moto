import { MemoryRedisStore } from '../../redis/redis-store';
import { AwsLocationReverseGeocoder, formatPlace } from './aws-location-reverse-geocoder';
import { CachedReverseGeocoder, cacheKey } from './cached-reverse-geocoder';
import { LocalReverseGeocoder, nearestStreetAddress } from './local-reverse-geocoder';

describe('geocodificação reversa', () => {
  it('local: rua mais próxima com número interpolado, bairro e cidade', () => {
    expect(nearestStreetAddress(-23.5614, -46.6559)).toMatch(/^Av\. Paulista, \d+ · Bela Vista, São Paulo$/);
    expect(nearestStreetAddress(-23.5667, -46.6935)).toMatch(/· Pinheiros, São Paulo$/);
    // Longe de qualquer trecho (Ibirapuera, ~2 km): só bairro/cidade; muito longe: nada.
    expect(nearestStreetAddress(-23.5874, -46.6576)).toMatch(/^[^,]+, São Paulo$/);
    expect(nearestStreetAddress(-22.9068, -43.1729)).toBeNull();
  });

  it('local: número cresce ao longo da rua', () => {
    const n = (lat: number, lng: number) => Number(/, (\d+) ·/.exec(nearestStreetAddress(lat, lng) ?? '')?.[1]);
    expect(n(-23.5700, -46.6466)).toBeLessThan(n(-23.5580, -46.6598));
  });

  it('aws: monta o endereço do Place e cai no Label sem rua', async () => {
    expect(formatPlace({ Street: 'Rua Teodoro Sampaio', AddressNumber: '1020', Neighborhood: 'Pinheiros', Municipality: 'São Paulo', Label: 'x' })).toBe('Rua Teodoro Sampaio, 1020 · Pinheiros, São Paulo');
    expect(formatPlace({ Label: 'Parque Ibirapuera, São Paulo' })).toBe('Parque Ibirapuera, São Paulo');
    expect(formatPlace(undefined)).toBeNull();
    const send = jest.fn().mockResolvedValue({ Results: [{ Place: { Street: 'Av. Paulista', AddressNumber: '1578', Municipality: 'São Paulo' } }] });
    const g = new AwsLocationReverseGeocoder({ send } as any, 'volti-places');
    await expect(g.reverse(-23.5614, -46.6559)).resolves.toBe('Av. Paulista, 1578 · São Paulo');
    const input = send.mock.calls[0][0].input;
    expect(input).toEqual({ IndexName: 'volti-places', Position: [-46.6559, -23.5614], MaxResults: 1, Language: 'pt-BR' });
  });

  it('cache: segunda leitura não chama o provedor; "sem endereço" também fica em cache; falha → null', async () => {
    const redis = new MemoryRedisStore();
    const inner = { reverse: jest.fn().mockResolvedValueOnce('A').mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('boom')) };
    const g = new CachedReverseGeocoder(inner, redis);
    await expect(g.reverse(-23.56141, -46.65591)).resolves.toBe('A');
    await expect(g.reverse(-23.56139, -46.65589)).resolves.toBe('A'); // mesma célula de ~11 m
    expect(inner.reverse).toHaveBeenCalledTimes(1);
    await expect(g.reverse(-22.9, -43.1)).resolves.toBeNull();
    await expect(g.reverse(-22.9, -43.1)).resolves.toBeNull();
    expect(inner.reverse).toHaveBeenCalledTimes(2);
    await expect(g.reverse(-23.6, -46.7)).resolves.toBeNull();
    expect(await redis.get(cacheKey(-23.6, -46.7))).toBeNull(); // falha não vai para o cache
    await expect(new LocalReverseGeocoder().reverse(-23.5614, -46.6559)).resolves.toContain('Av. Paulista');
  });
});
