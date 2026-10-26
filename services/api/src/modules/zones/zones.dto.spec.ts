import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GeoZoneInputDto } from './zones.dto';
import { validateZoneInput } from './zones.service';

/** Revisão final item 7: zona `reduced_speed` nunca abaixo de 6 km/h (0 cortaria o motor de uma moto em movimento). */
const square = { type: 'Polygon', coordinates: [[[-46.69, -23.56], [-46.68, -23.56], [-46.68, -23.55], [-46.69, -23.56]]] };
const input = (speedLimitKmh: number) => ({ name: 'Calçadão', type: 'reduced_speed', speedLimitKmh, geometry: square });
const errorsFor = async (body: object) => (await validate(plainToInstance(GeoZoneInputDto, body))).map((e) => e.property);

describe('GeoZoneInputDto: limite mínimo da zona de velocidade reduzida', () => {
  it.each([0, 1, 5])('speedLimitKmh %i → 400 (DTO)', async (kmh) => {
    expect(await errorsFor(input(kmh))).toContain('speedLimitKmh');
  });

  it.each([6, 20])('speedLimitKmh %i → aceito', async (kmh) => {
    expect(await errorsFor(input(kmh))).toEqual([]);
  });

  it('validação de negócio: reduced_speed abaixo de 6 → 422 zone-speed-limit-invalid', () => {
    expect(() => validateZoneInput(input(0) as any)).toThrow(expect.objectContaining({ slug: 'zone-speed-limit-invalid' }));
    expect(() => validateZoneInput(input(6) as any)).not.toThrow();
  });
});
