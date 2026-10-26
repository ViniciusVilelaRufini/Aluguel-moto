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

function load(flag: string | undefined): { controllers: any[]; TestHandoverController: any } {
  const prev = process.env.ALLOW_TEST_HANDOVER;
  if (flag === undefined) delete process.env.ALLOW_TEST_HANDOVER;
  else process.env.ALLOW_TEST_HANDOVER = flag;
  try {
    let result!: { controllers: any[]; TestHandoverController: any };
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { AppModule } = require('../../app.module') as typeof import('../../app.module');
      const { TestHandoverController } = require('./test-handover.controller') as typeof import('./test-handover.controller');
      /* eslint-enable @typescript-eslint/no-require-imports */
      result = { controllers: controllersOf(AppModule), TestHandoverController };
    });
    return result;
  } finally {
    if (prev === undefined) delete process.env.ALLOW_TEST_HANDOVER;
    else process.env.ALLOW_TEST_HANDOVER = prev;
  }
}

describe('AppModule × ALLOW_TEST_HANDOVER', () => {
  it('sem a variável (e com "false") → nenhum TestHandoverController', () => {
    for (const flag of [undefined, 'false']) {
      const { controllers, TestHandoverController } = load(flag);
      expect(controllers.length).toBeGreaterThan(10);
      expect(controllers).not.toContain(TestHandoverController);
    }
  });

  it('com ALLOW_TEST_HANDOVER=true → registra o TestHandoverController', () => {
    const { controllers, TestHandoverController } = load('true');
    expect(controllers).toContain(TestHandoverController);
  });
});
