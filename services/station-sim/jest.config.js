/** Testes unitários do simulador de estações (sem broker). */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  testTimeout: 20000,
};
