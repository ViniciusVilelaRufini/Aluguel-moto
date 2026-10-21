#!/usr/bin/env node
// Regenera os clientes a partir de openapi.yaml:
//   - generated/ts/schema.d.ts   (openapi-typescript; consumido com openapi-fetch no painel)
//   - generated/dart             (openapi-generator `dart-dio` + built_value; pacote `volti_api`)
// Uso: node scripts/generate.mjs [--only=ts|dart] [--skip-build-runner]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = join(root, 'openapi.yaml');
const tsOut = join(root, 'generated', 'ts', 'schema.d.ts');
const dartOut = join(root, 'generated', 'dart');

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const skipBuildRunner = args.includes('--skip-build-runner');
const isWin = process.platform === 'win32';

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: root, ...opts });
  if (res.status !== 0) {
    console.error(`\nFalhou (${res.status ?? res.error?.message}): ${cmd} ${cmdArgs.join(' ')}`);
    process.exit(res.status || 1);
  }
}

// As CLIs Node rodam direto pelo node (sem os wrappers .cmd do Windows, que exigem shell e quebram
// argumentos com espaço). O dart no Windows é dart.bat, então precisa de shell (argumentos sem espaço).
const nodeBin = (pkgPath) => (cmdArgs, opts) => run(process.execPath, [join(root, 'node_modules', pkgPath), ...cmdArgs], opts);
const openapiTypescript = nodeBin('openapi-typescript/bin/cli.js');
const openapiGenerator = nodeBin('@openapitools/openapi-generator-cli/main.js');
// Comando inteiro como string (argumentos fixos, sem espaço) para não passar `args` junto com `shell`.
const dart = (cmdArgs) => (isWin ? run(`dart ${cmdArgs.join(' ')}`, [], { cwd: dartOut, shell: true }) : run('dart', cmdArgs, { cwd: dartOut }));

function generateTs() {
  mkdirSync(dirname(tsOut), { recursive: true });
  // Sem isso, campos com `default` viram obrigatórios até nos corpos de requisição.
  openapiTypescript([spec, '-o', tsOut, '--default-non-nullable=false']);
}

// Arquivos mantidos à mão dentro de generated/dart (não são apagados na limpeza).
const DART_KEEP = new Set(['.openapi-generator-ignore', 'analysis_options.yaml']);

const DART_IGNORE = `# Mantido por scripts/generate.mjs — arquivos que o openapi-generator não deve (re)gerar.
# Testes stub gerados (vazios) não agregam e só aumentam o diff.
test/**
# analysis_options.yaml é mantido à mão (silencia unused_import do código gerado).
analysis_options.yaml
# CI do gerador (não usamos Travis/git_push).
.travis.yml
git_push.sh
`;

function generateDart() {
  mkdirSync(dartOut, { recursive: true });
  // Limpa a saída anterior para não sobrar arquivo de schema/endpoint removido do contrato.
  for (const entry of readdirSync(dartOut)) {
    if (!DART_KEEP.has(entry)) rmSync(join(dartOut, entry), { recursive: true, force: true });
  }
  writeFileSync(join(dartOut, '.openapi-generator-ignore'), DART_IGNORE);

  openapiGenerator([
    '--openapitools', join(root, 'openapitools.json'),
    'generate',
    '-i', spec,
    '-g', 'dart-dio',
    '-o', dartOut,
    // Opções do gerador em arquivo (o CLI repassa os argumentos ao java via shell e quebra valores com espaço).
    '-c', join(root, 'dart-generator.yaml'),
  ]);

  if (skipBuildRunner) return;
  // built_value precisa dos *.g.dart; eles são versionados para os apps só precisarem de `pub get`.
  dart(['pub', 'get']);
  dart(['run', 'build_runner', 'build', '--delete-conflicting-outputs']);
  dart(['format', '.']);
}

if (!existsSync(spec)) {
  console.error(`openapi.yaml não encontrado em ${spec}`);
  process.exit(1);
}
if (!only || only === 'ts') generateTs();
if (!only || only === 'dart') generateDart();
console.log('\nClientes gerados.');
