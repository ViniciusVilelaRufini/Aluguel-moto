/** Testes unitários (sem banco). */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 20000,
};
