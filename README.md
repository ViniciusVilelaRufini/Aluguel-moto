# Volti

Plataforma de aluguel de motos elétricas. Clientes alugam por minuto, hora, dia, semana ou mês, com seguro, pelo app. Cada moto tem um rastreador (GPS + 4G + relé/controlador) para rastrear, limitar velocidade e bloquear remotamente. O painel web permite ao admin acompanhar a frota em tempo real, gerenciar cercas, clientes e finanças. Operadores de campo usam um app para trocar baterias, recolher e inspecionar motos.

A especificação completa está em `docs/superpowers/specs/2026-10-21-volti-plataforma-design.md`, e o plano de implementação em `docs/superpowers/plans/`.

## Estrutura do monorepo

| Pasta | Conteúdo |
| --- | --- |
| `/infra` | AWS CDK (TypeScript) |
| `/services/api` | NestJS + Prisma + PostGIS + Redis |
| `/services/iot-sim` | Simulador de rastreadores (TypeScript) |
| `/services/traccar-bridge` | Ponte Traccar - shadow do IoT para rastreadores GT06 só relé (Concox J16), com emulador GT06 |
| `/apps/admin` | Next.js App Router + Tailwind + MapLibre |
| `/apps/cliente` | Flutter (app do cliente) |
| `/apps/operador` | Flutter (app de campo) |
| `/packages/contracts` | `openapi.yaml`, schemas MQTT e JSON Schemas, `realtime.md`, clientes gerados |
| `/packages/volti_flutter` | Tema e widgets Volti para Flutter |
| `/design-system` | Volti Design System (somente leitura; referência visual) |
| `/docs` | Decisões (`decisoes.md`), ADRs e relatórios de QA |
| `docker-compose.yml` | Ambiente local completo (raiz) |

O pnpm workspace (`pnpm-workspace.yaml`) cobre `infra`, `services/*`, `apps/admin` e `packages/contracts`. Os apps Flutter dependem por path de `packages/volti_flutter` e do cliente Dart gerado.

## Pré-requisitos

- Node 24 (ver `.nvmrc`)
- pnpm 9
- Docker (com Docker Compose)
- Flutter 3.41
- Java 17 (para o openapi-generator)

## Como rodar local

Sem AWS: toda dependência AWS fica atrás de uma interface com implementação `aws` e `local`, escolhida por variável de ambiente (ver `.env.example`).

```bash
cp .env.example .env
pnpm install
pnpm dev:deps   # sobe postgres (PostGIS), redis, mosquitto e minio
```

Para parar os serviços locais: `docker compose down` (os volumes são mantidos).

## Regras de produto

As motos são equipamentos autopropelidos (Resolução Contran 996/2023): até 1.000 W e 32 km/h. O software nunca pode permitir ultrapassar esses limites. Os dados de localização são pessoais (LGPD) e os trajetos expiram após 90 dias.
