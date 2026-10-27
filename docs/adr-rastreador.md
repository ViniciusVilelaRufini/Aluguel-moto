# ADR: integração dos rastreadores

- **Status:** aceita para a v1 (Task 4), com alternativa documentada.
- **Data:** 2026-10-21.
- **Contexto:** cada moto tem um rastreador (GPS + 4G + relé/controlador) que precisa reportar posição e estado, receber limite de velocidade e trava, e funcionar com rede instável. A plataforma roda na AWS (sa-east-1).

## Decisão

Rastreadores falam **MQTT sobre TLS com certificado X.509 por dispositivo** direto com o **AWS IoT Core**, usando o **device shadow** para o estado desejado/reportado (`travada`, `limite_kmh`, `modo_roubada`) e tópicos próprios para telemetria, eventos e comandos momentâneos. O contrato está em [`packages/contracts/mqtt.md`](../packages/contracts/mqtt.md).

- A API grava o desired pelo IoT Data Plane (`UpdateThingShadow`) e confirma pelo reported (`GetThingShadow`) — `AwsIotGateway`.
- Telemetria e eventos vão por regras IoT para SQS e são consumidos pela API; posições vão ao tracker do Amazon Location e as zonas são sincronizadas com a geofence collection (`AwsLocationGeofenceEngine`).
- O bloqueio seguro é feito no servidor (rampa de limite até parar) **e** no firmware (nunca trava acima de 3 km/h) — [`docs/firmware-bloqueio-seguro.md`](firmware-bloqueio-seguro.md).
- Provisionamento: `services/api/scripts/provision-tracker.ts` (thing, certificado, política de menor privilégio da Task 2, vínculo com `Vehicle`/`Tracker`).
- Desenvolvimento local: Mosquitto com o servidor emulando o serviço de shadow (`LocalMqttIotGateway`), nos mesmos tópicos; simulador em `services/iot-sim`.

### Por quê

- Shadow resolve "moto offline": o desired fica guardado e é aplicado ao reconectar, sem fila própria.
- Certificado por dispositivo + política com `${iot:Connection.Thing.ThingName}` isola cada moto (uma moto comprometida não lê nem comanda outra).
- Serviço gerenciado (escala, TLS, presença, regras) sem servidor para operar.

## Alternativa: hardware sem MQTT/TLS com certificado

Muitos rastreadores veiculares baratos só falam protocolos proprietários sobre TCP/UDP (GT06/Concox, Teltonika Codec 8, Queclink, H02, etc.), às vezes sem TLS. Se o hardware escolhido **não suportar MQTT/TLS com certificado X.509**:

**Traccar em ECS (Fargate) atrás de um NLB**, traduzindo para os mesmos tópicos e eventos:

```
rastreador ──TCP (porta do protocolo, ex.: 5023 GT06)──► NLB ──► Traccar (ECS)
                                                                    │ decodifica posições/eventos
                                                                    ▼
                                         ponte (container lateral ou Lambda via webhook do Traccar)
                                                                    │ publica com certificado do serviço
                                                                    ▼
                                AWS IoT Core: motos/{thingName}/telemetria, /eventos, shadow reported
```

- **Entrada:** NLB (TCP, preserva IP de origem) nas portas dos protocolos usados; security group restrito às faixas da operadora/APN privada quando possível. Sem TLS no rádio, o tráfego deve ir por **APN privada da operadora** (VPN até a VPC) — requisito de compra.
- **Tradução:** o Traccar decodifica o protocolo; uma ponte converte cada posição em `motos/{thingName}/telemetria` (mesmo schema) e cada alarme em `motos/{thingName}/eventos` (`queda`, `violacao`, `bateria_critica`, `movimento_sem_aluguel`), e mantém o shadow `reported` (travada, limite, firmware). O mapa IMEI → `thingName` vem da tabela `Tracker` (o script de provisionamento grava o IMEI).
- **Comandos:** a ponte assina `$aws/things/+/shadow/update/delta` e `motos/+/comandos` e os traduz para comandos do Traccar (API `/api/commands`: `engineStop`/`engineResume`, limite de velocidade quando o protocolo suportar). Se o protocolo não tiver limite de velocidade configurável, **o hardware não atende o requisito de rampa** e não pode ser homologado (o bloqueio sem rampa corta o motor em movimento).
- **Para a API nada muda:** mesmos tópicos, mesmo shadow, mesmo `AwsIotGateway`, mesmos eventos internos (`iot.telemetry`, `iot.device-event`, `iot.command-updated`, `iot.connectivity`).
- **Custos e riscos:** mais um serviço com estado (Traccar + banco próprio — usar RDS existente com schema separado), latência maior de comando (polling/ack do protocolo), confirmação de execução dependente do protocolo, e segurança menor sem TLS/certificado por dispositivo.

## Atualização 2026-10-27: rastreadores só relé (GT06) aceitos

Decisão do dono (spec `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`): o hardware do piloto é o
Concox J16 4G (GT06, TCP sem TLS, só relé). Rastreadores `relay_only` são aceitos com **rastreamento e bloqueio/liberação**:
o bloqueio espera a moto parar de forma confirmada e então corta (sem rampa); limites de zona viram aviso e alerta; os 32 km/h
ficam com o controlador da moto. A frase "o hardware não atende o requisito de rampa e não pode ser homologado" acima vale para
`speed_control`; `relay_only` segue a spec. A ponte é o serviço `services/traccar-bridge` (Traccar em ECS/NLB na proposta de CDK,
Traccar em container no dev single).

Riscos conhecidos (spec §12):
- **Janela residual:** entre a última amostra parada e a chegada do `engineStop`, a moto pode voltar a andar. A exigência de
  2 amostras em 10 s e a segunda guarda da ponte reduzem, mas não eliminam. Em produção, avaliar hardware com controle de velocidade.
- **Sem limite por zona imposto:** responsabilidade do condutor; refletir nos termos de uso (validar com jurídico).
- **32 km/h depende do controlador da moto:** verificar e documentar por modelo.
- **GT06 sem TLS:** exige APN privada em produção.
- **`bateria_pct` aproximado** (pela tensão; sem leitura se o J16 for alimentado por conversor DC-DC).
- **Comando enfileirado pelo Traccar:** se o dispositivo cair entre a checagem da ponte e o envio, o Traccar guarda o `engineStop`
  e o entrega na reconexão, em qualquer velocidade. A ponte só envia com o dispositivo online e registra `engine_stop_queued`
  (nível erro) quando o Traccar responde 202; verificar na bancada se o J16 recusa o corte acima de alguma velocidade.

## Consequências

- Requisito de compra do hardware: MQTT 3.1.1+ sobre TLS 1.2 com certificado X.509, armazenamento seguro da chave, controlador com limite de velocidade configurável (0..32) e trava eletrônica, implementação de F1–F10 do documento de firmware.
- Pendências de infraestrutura (propostas em `docs/decisoes.md`): regra de `motos/+/eventos` para a fila consumida pela API e fila para os eventos ENTER/EXIT do Amazon Location (EventBridge → SQS), se quisermos usar os eventos nativos em vez da contenção pelo PostGIS.
