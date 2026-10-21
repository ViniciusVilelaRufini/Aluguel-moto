/** Teste de contrato: sobe a API (Postgres/Redis do compose) e valida respostas contra o openapi.yaml. */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/contract'],
  testRegex: '.*\.contract-spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  setupFiles: ['<rootDir>/test/setup-e2e-env.ts'],
  testTimeout: 60000,
};
