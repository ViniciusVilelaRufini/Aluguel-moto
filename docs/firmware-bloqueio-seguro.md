# Bloqueio seguro: comportamento esperado do firmware

Requisito físico não negociável (CLAUDE.md): **nunca cortar o motor com a moto em movimento**. Bloquear = reduzir a potência gradualmente e travar só abaixo de 3 km/h. O servidor garante isso pela rampa descrita em [`packages/contracts/mqtt.md`](../packages/contracts/mqtt.md); o firmware é a segunda camada e deve garantir o mesmo **mesmo que o servidor erre, a rede caia ou um comando chegue fora de ordem**.

O firmware está fora do escopo da Task 4. Este documento é o requisito para o fornecedor do rastreador e o critério de homologação. O simulador (`services/iot-sim/src/model.ts`) implementa exatamente este comportamento.

## Regras obrigatórias

| # | Regra |
|---|---|
| F1 | **Nunca acionar a trava (`travada = true`) com velocidade ≥ 3 km/h**, qualquer que seja a origem do pedido (delta do shadow, `get/accepted`, botão local, timeout). O pedido fica **pendente** e é executado assim que a velocidade medida ficar < 3 km/h. Não reportar `travada: true` antes de travar de fato. |
| F2 | **Limite de velocidade:** aceitar `limite_kmh` inteiro de 0 a 32 e recusar qualquer outro valor (não truncar; manter o limite anterior). O limite máximo de 32 km/h e a potência de 1.000 W são travados no controlador independentemente do shadow. |
| F3 | **Redução gradual:** ao receber um limite menor que a velocidade atual, reduzir a potência de forma progressiva (desaceleração máxima de 4 km/h por segundo, ~1,1 m/s²), sem frenagem regenerativa brusca e sem corte do motor. |
| F4 | **Reportar:** depois de aplicar um delta, publicar `reported` com o campo aplicado e `velocidade_kmh`; enquanto estiver acima do limite (desacelerando) ou com trava pendente, publicar `reported.velocidade_kmh` a cada 1 s; ao travar, publicar `reported { travada: true, velocidade_kmh }`. |
| F5 | **Reconexão:** ao conectar, publicar o `reported` completo (`travada`, `limite_kmh`, `modo_roubada`, `firmware`, `velocidade_kmh`) e pedir `shadow/get`; aplicar o `delta` recebido com as mesmas regras (F1–F3). |
| F6 | **Destravar:** `travada = false` libera o motor com o `limite_kmh` em vigor (o servidor envia os dois juntos). Em `modo_roubada`, recusar destravamento local (só pelo shadow). |
| F7 | **Telemetria:** a cada 5 s destravada ou em modo roubada; a cada 60 s parada/travada. |
| F8 | **Perda de conexão:** manter o último estado aplicado (limite e trava). Sem conexão, nunca travar por conta própria em movimento. |
| F9 | **Movimento travada:** deslocamento > 20 m com a trava acionada → evento `movimento_sem_aluguel`. |
| F10 | **Presença:** registrar *last will* em `$aws/events/presence/disconnected/{thingName}` no ambiente local (o IoT Core gera os eventos de ciclo de vida sozinho em produção). |

## Por que F1 é a última linha de defesa (corrida inevitável)

O servidor decide publicar `travada: true` com base na **última velocidade reportada** — e só aceita amostras frescas (até 10 s), posteriores à reconexão e mais novas que as já recebidas; velocidade desconhecida é tratada como "em movimento". Mesmo assim existe uma janela entre a amostra (< 3 km/h) e a chegada do delta no rastreador: latência 4G de centenas de milissegundos a alguns segundos, mensagens enfileiradas no broker com a moto em túnel/sombra, ou um delta antigo aplicado ao reconectar. Nessa janela a moto pode ter voltado a acelerar (empurrada, ladeira, piloto acelerando de novo depois de parar).

Por isso o servidor nunca é suficiente sozinho: **o firmware precisa conferir a velocidade medida no instante de executar a trava** (F1) e, se for ≥ 3 km/h, manter o pedido pendente. Pelo mesmo motivo, o servidor não grava `travada: true` no shadow com a moto offline (o delta seria aplicado sabe-se lá em que velocidade) e o polling do shadow no modo aws não reaproveita um `reported.velocidade_kmh` antigo.

## Sequência típica (moto a 25 km/h)

```
servidor                               rastreador
desired limite_kmh=15  ───────────────►  reduz a potência (25 → 15 em ~2,5 s)
                       ◄───────────────  reported limite_kmh=15, velocidade_kmh=25
(espera 2 s)                             reported velocidade_kmh=21, 17, 15 (1/s)
desired limite_kmh=8   ───────────────►  …
desired limite_kmh=3   ───────────────►  …
desired limite_kmh=0   ───────────────►  desacelera até parar
                       ◄───────────────  reported velocidade_kmh=1
desired travada=true   ───────────────►  trava (velocidade < 3)
                       ◄───────────────  reported travada=true, velocidade_kmh=0
comando lock: confirmed
```

Se a moto não parar em 120 s, o comando termina `failed`/`did_not_stop`, o limite 0 fica mantido e o painel recebe alerta (`command_failed`, prioridade alta).

## Homologação

Bancada com o rastreador real e o servidor em `IOT_MODE=aws` (ou o Mosquitto local):

1. Rodando a 25 km/h (rolo), `POST /vehicles/{id}/commands { type: "lock" }`: verificar os degraus 15/8/3/0, nenhuma trava acima de 3 km/h (registro do controlador) e `confirmed` com a roda parada.
2. Publicar manualmente `desired { travada: true }` a 25 km/h: o rastreador **não** trava; trava só quando a velocidade cai abaixo de 3.
3. `desired { limite_kmh: 33 }` e `-1`: recusados, limite anterior mantido.
4. Desligar o 4G no meio da rampa: o limite aplicado é mantido; ao reconectar, o rastreador reporta e a rampa continua.
5. Medir a desaceleração máxima ao receber `limite_kmh: 0` a 32 km/h (≤ 4 km/h/s).

## Lado do servidor (coberto por testes)

- `services/api/src/modules/iot/safe-lock.service.spec.ts`: nunca publica `travada: true` com velocidade reportada ≥ 3 (inclusive exatamente 3); degraus 15, 8, 3, 0 a cada 2 s depois do reported; trava ao reportar 2 km/h; parada → trava direto; 120 s → `did_not_stop` com limite 0; offline → `pending` e rampa ao reconectar; unlock cancela.
- `services/api/test/iot/iot-safe-lock.e2e-spec.ts`: Mosquitto real, simulador em processo separado, `lock` pela API termina `confirmed` com a moto parada, com o mesmo invariante verificado no tráfego MQTT.
