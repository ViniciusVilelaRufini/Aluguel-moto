import { MODULE_METADATA } from '@nestjs/common/constants';

/** O AppModule real não registra a entrega simulada sem ALLOW_TEST_HANDOVER (rota ausente = 404). */
function controllersOf(root: any): any[] {
  const seen = new Set<any>();
  const out: any[] = [];
  const visit = (mod: any) => {
    const m = mod?.module ?? mod;
    if (!m || seen.has(mod)) return;
    seen.add(mod);
    out.push(...(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, m) ?? []), ...(mod?.controllers ?? []));
    for (const i of [...(Reflect.getMetadata(MODULE_METADATA.IMPORTS, m) ?? []), ...(mod?.imports ?? [])]) visit(i);
  };
  visit(root);
  return out;
}

type Loaded = { controllers: any[]; TestHandoverController: any; TestRentalEndController: any };

function load(flag: string | undefined): Loaded {
  const prev = process.env.ALLOW_TEST_HANDOVER;
  if (flag === undefined) delete process.env.ALLOW_TEST_HANDOVER;
  else process.env.ALLOW_TEST_HANDOVER = flag;
  try {
    let result!: Loaded;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { AppModule } = require('../../app.module') as typeof import('../../app.module');
      const { TestHandoverController } = require('./test-handover.controller') as typeof import('./test-handover.controller');
      const { TestRentalEndController } = require('../rentals/test-rental-end.controller') as typeof import('../rentals/test-rental-end.controller');
      /* eslint-enable @typescript-eslint/no-require-imports */
      result = { controllers: controllersOf(AppModule), TestHandoverController, TestRentalEndController };
    });
    return result;
  } finally {
    if (prev === undefined) delete process.env.ALLOW_TEST_HANDOVER;
    else process.env.ALLOW_TEST_HANDOVER = prev;
  }
}

describe('AppModule × ALLOW_TEST_HANDOVER', () => {
  it('sem a variável (e com "false") → nenhum TestHandoverController nem TestRentalEndController', () => {
    for (const flag of [undefined, 'false']) {
      const { controllers, TestHandoverController, TestRentalEndController } = load(flag);
      expect(controllers.length).toBeGreaterThan(10);
      expect(controllers).not.toContain(TestHandoverController);
      expect(controllers).not.toContain(TestRentalEndController);
    }
  });

  it('com ALLOW_TEST_HANDOVER=true → registra o TestHandoverController e o TestRentalEndController', () => {
    const { controllers, TestHandoverController, TestRentalEndController } = load('true');
    expect(controllers).toContain(TestHandoverController);
    expect(controllers).toContain(TestRentalEndController);
  });
});
