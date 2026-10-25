# Simulador de rastreadores (`services/iot-sim`)

N motos virtuais conectadas por MQTT, rodando rotas em Pinheiros, Vila Madalena e Paulista, com o mesmo contrato dos rastreadores reais ([`packages/contracts/mqtt.md`](../../packages/contracts/mqtt.md)). Serve para demo do painel, testes de integração e carga.

Cada moto:
- usa o `thingName` do seed (`moto-0001`…) como `clientId`, com *last will* de presença;
- publica telemetria a cada 5 s destravada e 60 s travada; reporta o shadow e aplica os deltas (`travada`, `limite_kmh`, `modo_roubada`);
- **obedece ao shadow como o firmware deve obedecer** ([`docs/firmware-bloqueio-seguro.md`](../../docs/firmware-bloqueio-seguro.md)): nunca passa de 32 km/h nem acelera acima do `limite_kmh`, desacelera na taxa do controlador (4 km/h/s), recusa limites fora de 0..32 e só trava abaixo de 3 km/h (a trava fica pendente com a moto andando);
- gera eventos configuráveis (`queda`, `violacao`, `bateria_critica`, `movimento_sem_aluguel`); `bateria_critica` também sai sozinho abaixo de 10%.

## Frota do banco (`SIM_FLEET_SOURCE=postgres`, dev single na AWS)

Em vez das 50 motos de demonstração, um rastreador por moto **cadastrada** (`thingName` do `Vehicle`), lido do Postgres da API só com `SELECT` (`DATABASE_URL`, nunca logado), agora e a cada `SIM_FLEET_REFRESH_SEC`:

- **posição:** moto `free`/`maintenance` com `depotId` → a posição do **galpão**; as demais → a última gravada (`lat`/`lng`). Moto sem posição (0,0) fica fora;
- **parada:** velocidade 0, travada/limite como no banco (limite sempre ≤ 32), telemetria a cada 60 s (heartbeat que mantém o `online` da API);
- **comandos:** responde ao shadow como o firmware (unlock, lock só abaixo de 3 km/h, limite 0..32, modo roubada). Com `SIM_RIDE_ON_UNLOCK=false` (padrão no dev single) a moto destravada continua parada; com `true`, um piloto simulado anda num laço de ~220 m perto de onde ela está;
- **moto levada:** travada e parada há `SIM_RELOCATE_AFTER_SEC` (padrão 180 s) com o cadastro a mais de 50 m (chegada ao galpão pelo recolhimento ou pela entrega) → o rastreador passa a reportar o novo ponto. Moto andando ou destravada nunca é movida;
- moto nova no cadastro ganha rastreador no próximo ciclo; removida continua conectada até reiniciar o simulador.

No dev single (`deploy/single/compose.yml`, serviço `iot-sim`) liga/desliga pelo parâmetro `/volti/dev/config/IOT_SIM` (ver `deploy/single/cloudshell.md`).

## Como rodar

```bash
pnpm dev:deps                                   # mosquitto (e o resto da stack)
pnpm --filter api dev                           # a API em IOT_MODE=local consome o Mosquitto
pnpm --filter iot-sim dev                       # 50 motos (tsx)
# ou em container:
docker compose --profile sim up -d iot-sim      # SIM_VEHICLES=50 por padrão
```

## Variáveis

| Variável | Padrão | O que faz |
|---|---|---|
| `MQTT_URL` | `mqtt://localhost:1883` | broker |
| `SIM_FLEET_SOURCE` | `routes` | `routes` (motos de demonstração) ou `postgres` (frota cadastrada; seção acima) |
| `DATABASE_URL` | — | obrigatória com `postgres` (só leitura) |
| `SIM_FLEET_REFRESH_SEC` | `60` | releitura da frota (`postgres`) |
| `SIM_RELOCATE_AFTER_SEC` | `180` | tempo travada e parada antes de seguir a posição do cadastro (`postgres`) |
| `SIM_VEHICLES` | `50` | quantidade de motos (`routes`) |
| `SIM_FIRST_VEHICLE` | `1` | primeira moto (`moto-0001`) |
| `SIM_RIDING_RATIO` | `0.6` | fração que começa destravada e andando (demo); as demais ficam travadas |
| `SIM_RIDE_ON_UNLOCK` | `true` | ao destravar pelo shadow, o "piloto" simulado começa a andar |
| `SIM_CRUISE_MIN_KMH` / `SIM_CRUISE_MAX_KMH` | `14` / `26` | velocidade de cruzeiro sorteada por moto (máximo aceito: 32; acima é erro, não trunca) |
| `SIM_TELEMETRY_RIDING_MS` / `SIM_TELEMETRY_PARKED_MS` | `5000` / `60000` | intervalos de telemetria |
| `SIM_TICK_MS` | `1000` | passo da simulação |
| `SIM_EVENTS` | vazio | eventos aleatórios por moto por hora, ex.: `queda=0.2,violacao=0.05` |
| `SIM_INJECT` | vazio | eventos programados, ex.: `moto-0003:queda@30,moto-0007:movimento_sem_aluguel@90` (segundos após a partida) |
| `SIM_SEED` | `42` | semente (rotas, velocidades e eventos reproduzíveis) |
| `SIM_DURATION_SEC` | `0` | encerra depois de N segundos (0 = não encerra) |

Logs em JSON (`sim_started`, `sim_status` a cada 30 s, `evento_injetado`, `sim_fleet_synced`, `sim_relocated`, `sim_fleet_load_failed`), sem coordenadas nem credenciais.

## Testes

```bash
pnpm --filter iot-sim test   # modelo de movimento, obediência ao shadow, contrato (mensagens validadas contra packages/contracts/schemas com ajv), config, frota do banco (posição do galpão, moto levada)
pnpm --filter iot-sim lint
```

O e2e `services/api/test/iot/iot-safe-lock.e2e-spec.ts` sobe este simulador como processo separado para o teste de bloqueio seguro com o Mosquitto real.
