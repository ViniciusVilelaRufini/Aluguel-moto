import { JsonLogger, maskStockThingNames } from './json-logger';

describe('JsonLogger: thingName do estoque (gt06-<IMEI>) mascarado', () => {
  it('mantém só os 4 últimos dígitos do IMEI', () => {
    expect(maskStockThingNames('x gt06-869890080273430 y')).toBe('x gt06-***********3430 y');
    expect(maskStockThingNames('moto-0059')).toBe('moto-0059');
  });

  it('campos, mensagem de texto e stack passam pela máscara', () => {
    const out: string[] = [];
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(((l: string) => out.push(l)) as any);
    const err = jest.spyOn(process.stderr, 'write').mockImplementation(((l: string) => out.push(l)) as any);
    try {
      const logger = new JsonLogger();
      logger.log({ msg: 'x', thingName: 'gt06-869890080273430', nested: { where: { thingName: 'gt06-869890080273430' } } }, 'Ctx');
      logger.warn('falhou gt06-869890080273430', 'Ctx');
      logger.error({ msg: 'e' }, 'Error: gt06-869890080273430\n    at x', 'Ctx');
    } finally {
      write.mockRestore();
      err.mockRestore();
    }
    expect(out).toHaveLength(3);
    expect(out.join('')).not.toContain('869890080273430');
    expect(out.join('')).toContain('gt06-***********3430');
  });
});
