/** e2e contra Postgres + Redis do docker compose (`pnpm dev:deps`, migrate e seed antes). */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '.*\.e2e-spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  setupFiles: ['<rootDir>/test/setup-e2e-env.ts'],
  testTimeout: 60000,
};
