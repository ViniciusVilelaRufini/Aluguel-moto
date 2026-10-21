# Simulador de rastreadores (`services/iot-sim`)

N motos virtuais conectadas por MQTT, rodando rotas em Pinheiros, Vila Madalena e Paulista, com o mesmo contrato dos rastreadores reais ([`packages/contracts/mqtt.md`](../../packages/contracts/mqtt.md)). Serve para demo do painel, testes de integração e carga.

Cada moto:
- usa o `thingName` do seed (`moto-0001`…) como `clientId`, com *last will* de presença;
- publica telemetria a cada 5 s destravada e 60 s travada; reporta o shadow e aplica os deltas (`travada`, `limite_kmh`, `modo_roubada`);
- **obedece ao shadow como o firmware deve obedecer** ([`docs/firmware-bloqueio-seguro.md`](../../docs/firmware-bloqueio-seguro.md)): nunca passa de 32 km/h nem acelera acima do `limite_kmh`, desacelera na taxa do controlador (4 km/h/s), recusa limites fora de 0..32 e só trava abaixo de 3 km/h (a trava fica pendente com a moto andando);
- gera eventos configuráveis (`queda`, `violacao`, `bateria_critica`, `movimento_sem_aluguel`); `bateria_critica` também sai sozinho abaixo de 10%.

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
| `SIM_VEHICLES` | `50` | quantidade de motos |
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

Logs em JSON (`sim_started`, `sim_status` a cada 30 s, `evento_injetado`), sem coordenadas.

## Testes

```bash
pnpm --filter iot-sim test   # modelo de movimento, obediência ao shadow, contrato (mensagens validadas contra packages/contracts/schemas com ajv), config
pnpm --filter iot-sim lint
```

O e2e `services/api/test/iot/iot-safe-lock.e2e-spec.ts` sobe este simulador como processo separado para o teste de bloqueio seguro com o Mosquitto real.
