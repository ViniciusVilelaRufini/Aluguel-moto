# Simulador das estações de troca (`services/station-sim`)

Faz o papel do armário de baterias enquanto não há fornecedor: escuta os comandos da API por MQTT e responde com os eventos da estação, no contrato de [`packages/contracts/mqtt.md`](../../packages/contracts/mqtt.md) (seção "Estações de troca", schemas `estacao-comandos.schema.json` e `estacao-eventos.schema.json`). Usado na troca de bateria pelo cliente via QR (`POST /swap-stations/{id}/swaps`).

- Responde só pelas estações de `STATION_SIM_STATIONS`, ou por todas com `STATION_SIM_ALL=true` / `--all` (explícito: sem um dos dois o simulador não sobe). Recusa `MQTT_URL` do AWS IoT Core (`amazonaws.com`): só roda contra o Mosquitto de desenvolvimento.
- `open_slot` → abre a primeira vaga livre (`slot_opened`).
- **Modo automático** (padrão): depois devolve a bateria que a moto leva (`battery_returned` com a série enviada em `expectedSerial` e carga baixa sorteada), fecha a vaga (`slot_closed`) e, quando a API pede `release_battery`, libera a bateria sugerida (`serialHint`) ou uma do estoque simulado (`SIM-<id>-001`…) — um passo a cada `STATION_SIM_STEP_MS`.
- **Modo manual** (demonstração): a vaga abre sozinha; o resto é pelo teclado.
- `abort_swap` (troca cancelada pelo cliente ou vencida na API) → fecha a vaga, se aberta ou ainda abrindo, e confirma com `slot_closed`; nada mais é devolvido nem liberado nessa troca.
- Comando repetido (mesmo `commandId`) é ignorado. `release_battery` sem devolução registrada é **recusado** (a estação real também não libera bateria sem receber a descarregada).
- Logs em JSON só com ids (o simulador não conhece o cliente nem a posição).

## Como rodar

```bash
pnpm dev:deps                                   # mosquitto
pnpm --filter api dev                           # API com IOT_MODE=local (padrão)
pnpm --filter station-sim dev                   # modo automático, todas as estações (--all)
pnpm --filter station-sim dev:manual            # modo manual (teclas abaixo), todas as estações
STATION_SIM_STATIONS=d0000000-0000-4000-8000-000000000001 pnpm --filter station-sim exec tsx src/main.ts   # só uma estação
```

Sem simulador nenhum: a API em `IOT_MODE=stub` tem uma estação imaginária que avança sozinha (`STATION_STUB_STEP_MS`, padrão 1,5 s); é o que os e2e e o emulador usam.

Teclas do modo manual:

| Tecla | O que faz |
|---|---|
| `d` | devolve a bateria na vaga aberta mais antiga e fecha a vaga |
| `f` | fecha a vaga mais antiga sem devolver (a API cancela a troca) |
| `l` | libera a bateria carregada da liberação pedida mais antiga |
| `s` | situação das trocas em andamento |
| `h` | ajuda |
| `q` / Ctrl+C | sair |

Para testar a troca pelo app ou por `curl`, use o QR de uma estação do seed: emita com `pnpm --filter api stations:qr` (imprime os payloads) — o README da API lista os do segredo de dev.

## Variáveis

| Variável | Padrão | O que faz |
|---|---|---|
| `MQTT_URL` | `mqtt://localhost:1883` | broker |
| `STATION_SIM_MODE` | `auto` | `auto` ou `manual` (também `--auto` / `--manual`) |
| `STATION_SIM_STEP_MS` | `2000` | intervalo entre os passos (50 a 120000) |
| `STATION_SIM_SLOTS` | `12` | vagas por estação |
| `STATION_SIM_STATIONS` | vazio | ids das estações atendidas, separados por vírgula |
| `STATION_SIM_ALL` | vazio | `true` (ou `--all`) responde por todas as estações; obrigatório quando `STATION_SIM_STATIONS` está vazio |
| `STATION_SIM_RETURN_PCT_MIN` / `STATION_SIM_RETURN_PCT_MAX` | `5` / `25` | carga sorteada da bateria devolvida |
| `STATION_SIM_SEED` | `7` | semente (cargas e séries reproduzíveis) |

Em container: `docker build -f services/station-sim/Dockerfile .` (a partir da raiz) e `docker run --network host -e MQTT_URL=mqtt://localhost:1883 -e STATION_SIM_ALL=true <imagem>`.

## Testes

```bash
pnpm --filter station-sim test   # automático, manual, abort_swap, repetição, recusa de liberação sem devolução, vagas, filtro, travas de configuração; eventos e comandos validados contra os schemas com ajv
pnpm --filter station-sim lint
```
