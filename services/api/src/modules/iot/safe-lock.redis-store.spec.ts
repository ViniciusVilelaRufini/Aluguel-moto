/**
 * Lacunas T5: as suítes do bloqueio seguro (unitária e de regressões das revisões) rodam de novo com o estado da rampa
 * serializado no "Redis" (`RedisSafeLockStore` sobre `MemoryRedisStore`, o mesmo JSON e o mesmo lock do Redis real) no lugar
 * do armazenamento em memória. Nenhum invariante físico pode depender de o estado ficar num objeto do processo.
 */
jest.mock('./safe-lock.store', () => {
  const actual = jest.requireActual('./safe-lock.store');
  const { MemoryRedisStore } = jest.requireActual('../../redis/redis-store');
  return {
    ...actual,
    MemorySafeLockStore: class extends actual.RedisSafeLockStore {
      constructor() {
        super(new MemoryRedisStore());
      }
    },
  };
});

describe('[estado no Redis]', () => {
  // As suítes registram os próprios `describe` ao serem carregadas, com o mock acima em vigor.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./safe-lock.service.spec');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./safe-lock.regression.spec');
});
