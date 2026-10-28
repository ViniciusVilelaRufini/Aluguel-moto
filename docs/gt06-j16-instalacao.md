# Guia de campo: instalar e testar um Concox/Jimi J16 (GT06, só relé) numa moto Volti

Para o **dono**, na bancada e na moto. A parte de servidor (Traccar, ponte, porta 5023, provisionamento) fica com o
controlador (Claude), pelos comandos da seção 2. Spec: `docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md`
(apêndice "tarefas do dono"); funcionamento da ponte: `services/traccar-bridge/README.md`; runbook do dev single:
`deploy/single/cloudshell.md` ("Rastreador GT06").

Como o sistema bloqueia um J16 (resumo): o J16 **não limita velocidade**. Um bloqueio pedido no painel espera a moto
**parar** (2 posições do GPS abaixo de 3 km/h cobrindo pelo menos 10 s, com intervalo de no máximo 10 s entre elas) e só
então manda o corte do relé (`Relay,1#` pelo Traccar). Se a moto não parar em 120 s, o bloqueio falha sem cortar nada.
A confirmação ("Travada") vem do bit de corte que o J16 manda no status/heartbeat, não do "comando aceito".

> **Sobre os comandos SMS.** Não há manual público oficial do J16; os comandos abaixo vêm de guias de revendedores e da
> família GT06 da Concox (fontes no fim). O que estiver marcado **"confirmar no manual do seu J16"** pode mudar com o
> firmware. Regra de ouro: mande **um comando por vez**, espere a resposta por SMS e confira com `PARAM#` no fim.

---

## 1. O que você precisa ter em mãos

- [ ] J16 4G + chicote + relé do kit (12 V, 5 pinos: 30, 87, 87a, 85, 86).
- [ ] Chip M2M **com plano de dados ativo** (o kit não traz chip), de preferência sem PIN. Anote APN, usuário e senha que a
      operadora informar. Plano: **pelo menos 100 MB/mês por moto** (conta na seção 3.4).
- [ ] Conversor DC-DC step-down para 12 V (seção 4.2) com fusível de 1–2 A na entrada.
- [ ] Multímetro, fita isolante/termorretrátil, abraçadeiras.
- [ ] Celular para mandar SMS ao número do chip do J16.
- [ ] O **IMEI** do J16 (15 dígitos, na etiqueta do aparelho ou da caixa; também volta no `PARAM#`).
- [ ] Acesso ao painel admin (`https://api-volti-dev...` pelo `volti-dev-admin`), usuário do grupo `admin` ou `operacao`.

O dev single fica **fora do ar das 23:00 às 07:00** (agenda da instância): o J16 aparece offline nesse horário, é normal.

---

## 2. O que o controlador faz (e o que você manda para ele)

**Você manda só duas coisas:** o **IMEI** do J16 e o **código da moto** em que ele vai (ex.: `VLT-0061`; se a moto ainda não
existir no painel, peça para cadastrar). O controlador escolhe o thing (ex.: `moto-0061`) e roda, nesta ordem:

1. Abrir a 5023 para o J16 real (uma vez por bateria de testes): `cdk deploy` da `volti-dev-single` com
   `-c gt06Port=true -c openGt06=true` (chip M2M comum não tem faixa de IP fixa; só bancada) e
   `/volti/dev/config/GT06_BIND=0.0.0.0` + `volti-dev-update` (detalhes em `deploy/single/cloudshell.md`).
2. Provisionar (com a moto **livre**: sem aluguel, sem reserva e sem comando de bloqueio em andamento):

   ```bash
   CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
     --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh provision VLT-0061 moto-0061 <IMEI>"]' \
     --query Command.CommandId --output text)
   aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
   ```

   Isso marca o `Tracker` como `relay_only`, cria o dispositivo no Traccar (`uniqueId` = IMEI) e o **vincula ao usuário da
   ponte**. Com o `iot-sim` ligado, esperar **60 s** (um ciclo) antes de testar o bloqueio.
3. Diagnóstico a qualquer momento (só leitura; não mostra IMEI completo nem posição):

   ```bash
   CMD=$(aws ssm send-command --instance-ids $IID --document-name AWS-RunShellScript \
     --parameters 'commands=["bash /opt/volti/src/deploy/single/gt06.sh status moto-0061"]' --query Command.CommandId --output text)
   aws ssm get-command-invocation --command-id $CMD --instance-id $IID --query StandardOutputContent --output text
   ```

   Mostra: Tracker no banco e se a ponte o enxerga (registro), versão do Traccar (mínimo 6.7.0), dispositivo
   online/offline e há quanto tempo falou, se o usuário da ponte vê o dispositivo, idade da última mensagem e do último fix
   do GPS, bit de corte e tensão externa da última mensagem, logs da ponte desta moto nos últimos 15 min (contagem por
   evento, ex.: `telemetry_held awaiting_status`, `battery_unknown`, `engine_stop_refused <motivo>`), estado ao vivo da API
   (online, travada, bateria) e a fase do bloqueio em andamento. Termina com `diagnóstico: nenhum problema encontrado` ou a
   lista de `ATENÇÃO:`.

**Servidor para o J16:** use o **nome** `api-volti-dev.prestarecondominios.com.br`, porta **5023**, TCP. É o mesmo nome da
API: ele aponta para o IP público da EC2 do dev (o Caddy atende 80/443 e o Traccar atende a 5023 na mesma máquina). Prefira
o nome ao IP: **o IP muda a cada partida da instância** (todo dia, pela agenda) e o DNS acompanha com TTL de 60 s. Use o IP
só se o controlador pedir (ex.: o firmware não aceitar domínio), sabendo que vai ter de reenviar o `SERVER` quando ele mudar.

---

## 3. Configurar o J16 por SMS (na bancada, antes de instalar)

Ligue o J16 numa fonte de 12 V (ou no DC-DC), **com o chip inserido com o aparelho desligado**, perto de uma janela ou ao ar
livre (GPS precisa de céu). Espere 1–2 min para ele registrar na rede. Mande cada SMS abaixo para o número do chip.

### 3.1 Senha

A maioria dos J16 vem **sem senha de SMS** (os comandos abaixo vão sem senha). Se o aparelho não responder a nada, ou
responder "password error", ele tem senha ativa: a senha entra como **primeiro parâmetro** (ex.: `SERVER,<senha>,1,...#`) e o
padrão de fábrica costuma ser `123456` ou `666666`. **Confirmar no manual do seu J16.** (O Traccar não usa senha no
`Relay,1#`; se o seu J16 exigir senha também nos comandos vindos do servidor, avise o controlador.)

### 3.2 Sequência recomendada

| # | SMS | Para quê | Resposta esperada (aprox.) | Confiança |
|---|---|---|---|---|
| 1 | `PARAM#` | ver IMEI, `TIMER`, `HBT` e servidor atuais (guarde a resposta) | `IMEI:...;TIMER:...;HBT:...` | alta |
| 2 | `ASETAPN,OFF#` | impede o J16 de trocar o APN sozinho | `OK` | média (guia BR) |
| 3 | `APN,<apn>,<usuário>,<senha>#` | APN do chip (sem usuário/senha: `APN,<apn>#`) | `APN:<apn>,...` | alta |
| 4 | `SERVER,1,api-volti-dev.prestarecondominios.com.br,5023,0#` | servidor por **domínio**, porta 5023, TCP | `Server:1,...,5023,0` / `OK` | alta |
| 5 | `GMT,E,0,0#` | fuso UTC (o sistema converte para São Paulo) | `OK` | alta (`GMT,W,0,0#` é o mesmo) |
| 6 | `TIMER,5,5#` | posição a cada 5 s com e sem ignição (seção 3.4) | `TIMER ACC ON:5s,ACC OFF:5s` | média: faixa 5–60 / 5–1800 s |
| 7 | `HBT,60,60#` | heartbeat de 60 s (**obrigatório ≤ 60 s**, seção 3.5) | `HBT ACC ON:60s,ACC OFF:60s` | **baixa: unidade varia** |
| 8 | `SZCS#SLPDISCONNECT=0` | sempre conectado (sem dormir parado) | `OK` | baixa (guia BR) |
| 9 | `ADT,ON#` | liga o envio da tensão externa (bateria %) | `OK` | baixa (guia BR) |
| 10 | `GPRSON,1#` | garante os dados ligados | `OK` | média |
| 11 | `RESET#` | reinicia para aplicar | `RESET OK` | alta |
| 12 | `PARAM#`, `GPRSSET#`, `STATUS#` | conferir tudo (2 min depois do reset) | `GPRS:Online` no `STATUS#` | alta |

Notas:

- **APN no Brasil (exemplos de revendedor, confirme com a operadora):** Claro M2M `iot.m2m.br` (usuário/senha `claro`), Vivo
  M2M `m2m.wc.br` (usuário/senha `vivo`). Alguns firmwares usam a forma `SZCS#APN=<apn>#USERPPP=<usuário>#PWPPP=<senha>`
  quando o `APN,...#` não pega. **Confirmar no manual do seu J16.**
- **`SERVER`**: o primeiro número diz o tipo do endereço — `1` = domínio, `0` = IP (`SERVER,0,<ip>,5023,0#`); o último `0` é
  TCP. **Confirmar no manual do seu J16** se o último campo significa TCP no seu firmware (em alguns é reservado).
- **`HBT` (heartbeat)**: um guia do J16 dá a faixa em **segundos** (`HBT,T1,T2#`, 60–300 s); outros firmwares Concox usam
  **minutos** (`HBT,3,5#` = 3 e 5 min). Mande `HBT,60,60#`; se a resposta recusar ou o `PARAM#` mostrar `HBT:60` em
  minutos, mande `HBT,1,1#` (1 minuto). O resultado tem de ser **60 s**. **Confirmar no manual do seu J16.**
- **Não mande** `SZCS#GPS_DISSLP=0` (desliga o GPS com a ignição desligada: o bloqueio precisa de posições paradas) nem
  `SZCS#SOURCE_OFF_TYPE=1` ("bloqueio imediato", seção 3.6). Não mande `FACTORY#` sem necessidade (apaga a configuração,
  menos `SERVER`/`APN`).
- Outros úteis: `WHERE#` (posição atual por SMS), `VERSION#` (firmware), `STATUS#` (GPRS, sinal, ACC, GPS, bateria interna),
  `RELAY#` (estado do relé, se o firmware tiver). **Não use `RELAY,1#` por SMS com alguém na moto.**
- Protocolo: deixe o padrão. Só mexa em `SZCS#GT06SEL=...` se o controlador pedir (muda o formato das mensagens que o
  Traccar decodifica).

### 3.3 O sentido do relé (confira na bancada)

O Traccar manda **`Relay,1#` para cortar** e **`Relay,0#` para liberar** (código do `Gt06ProtocolEncoder`). Guias brasileiros
do J16 e o manual GT06 dizem o mesmo (`RELAY,1#` = bloqueia). Um guia de revendedor do J16 diz o contrário (`RELAY,0#` =
corta). **Confirmar no manual do seu J16 e na bancada** (seção 5, passo 4): se o seu J16 for invertido, o corte do sistema
liberaria a moto — pare e avise o controlador (o Traccar tem modos alternativos de comando por modelo).

### 3.4 Intervalo de posição (`TIMER`) e plano de dados

O bloqueio só corta depois de **2 posições paradas cobrindo ≥ 10 s com no máximo 10 s entre uma e outra**; posição com mais
de 10 s não vale. Com `TIMER` de 10 s, qualquer atraso da rede (10,5 s) recomeça a contagem e o bloqueio tende a terminar
`did_not_stop`. Por isso: **`TIMER,5,5#`** (5 s com e sem ignição). O J16 não muda o intervalo em tempo real pelo sistema,
então o 5 s é fixo.

Estimativa de dados (TCP/IP incluído, aproximada): posição GT06 ≈ 36 bytes + ~80 bytes de cabeçalhos/ACK ≈ 120 bytes.

| Configuração | Posições/dia | Dados/mês (posições + heartbeat 60 s) |
|---|---|---|
| `TIMER,5,5#` (recomendado) | 17.280 | **~65–70 MB** |
| `TIMER,5,10#` | 8.640 parado | ~35–40 MB (bloqueio no limite; não recomendado) |
| `TIMER,30,300#` (padrão de muitos revendedores) | — | ~5 MB, **mas o bloqueio nunca confirma a parada** |

Plano de **100 MB/mês por moto** dá folga (reconexões, SMS de configuração). Em produção, se o custo pesar, a alternativa é
hardware com controle de velocidade ou um firmware que aceite mudar o `TIMER` por comando do servidor (fora do escopo atual).

### 3.5 Heartbeat (`HBT`) — obrigatório ≤ 60 s

É o heartbeat (status) do GT06 que traz o **bit de corte**. A ponte:

- **segura toda a telemetria** da moto até receber o primeiro status depois de cada (re)conexão (a moto não aparece se
  movendo no painel até lá);
- não aceita bit de corte com mais de **90 s** para "já travada" nem para confirmar o bloqueio.

Heartbeat de 3 min (padrão comum) = moto "sumida" depois de cada reconexão e "Travada" que nunca confirma.

### 3.6 O corte do próprio J16 (segurança do firmware)

O manual da família GT06 descreve: com ignição ligada e **GPS fixado**, o corte só executa abaixo de **20 km/h**; com
ignição ligada e **sem GPS**, o comando fica **adiado** (executa depois); com ignição desligada, executa na hora.
Consequências:

- O sistema Volti só manda o corte com a moto parada; a regra de 20 km/h do J16 é uma rede de proteção extra, não a principal.
- **Na bancada coberta, sem GPS**, com a ignição ligada o J16 pode adiar o corte: o painel termina "falhou: sem resposta da
  moto" e o relé atua depois. Faça os testes **com céu aberto** (e, de qualquer forma, sem GPS válido não há posição e o
  bloqueio nem começa).
- **Nunca** ligue o "bloqueio imediato" (`SZCS#SOURCE_OFF_TYPE=1`, que ignora a velocidade). Na dúvida, consulte o valor
  atual e deixe em `0`. **Confirmar no manual do seu J16** se esses limites (20 km/h, adiamento) valem para o seu firmware.

---

## 4. Ligação elétrica (só relé)

**Desligue a bateria da moto (ou a chave geral) antes de mexer.** Cores de fio variam entre lotes: **confirmar no manual do
seu J16 / etiqueta do chicote** antes de ligar. Típico Concox: vermelho = +, preto = GND, laranja/amarelo = ACC, e um par
para a bobina do relé.

### 4.1 Onde vai o relé

- O relé **interrompe o fio de habilitação do controlador** (o fio fino da chave/ignição que "liga" o controlador, às vezes
  chamado de "trava elétrica" ou "E-lock"), **em série**. Esse fio leva pouca corrente.
- **Nunca** no cabo principal da bateria (positivo/negativo grosso do pack) e **nunca** nas fases do motor (3 fios grossos
  entre controlador e motor). Cortar ali sob carga cria arco, pode queimar o controlador e para a roda de forma brusca.
- Cortar a habilitação faz o controlador parar de acionar o motor (a roda gira livre até parar); não trava a roda
  mecanicamente.
- Contatos do relé: o relé automotivo do kit é especificado para ~14 V DC. Se o fio da chave estiver na tensão do pack
  (48–72 V), meça a corrente (deve ser bem baixa) e, se possível, use relé com contato especificado para essa tensão.

### 4.2 Contato NF ou NA — decida antes de instalar

| Ligação | Relé em repouso (J16 sem energia ou sem comando) | Quando o J16 manda cortar |
|---|---|---|
| **30 + 87a (NF, normalmente fechado)** — padrão Concox | moto **anda** | bobina energiza, abre, moto para de acionar |
| 30 + 87 (NA, normalmente aberto) | moto **bloqueada** | bobina energiza, **fecha**: o corte do sistema **liberaria** a moto |

O apêndice da spec diz "com o relé em repouso, a moto deve ficar bloqueada" (NA). **Atenção:** com o `Relay,1#` do Traccar
energizando a saída para cortar, a ligação NA **inverte** o comando, e uma falha de energia do J16 (fusível, DC-DC, fio
solto) **com a moto andando cortaria o motor em movimento** — contra a regra de segurança física do projeto. Recomendação
deste guia: **NF (30 + 87a)**, e o estado do relé depois de um reinício conferido na bancada (passo 9 da seção 5). Se você
quiser mesmo o NA (moto bloqueada sem rastreador), fale com o controlador antes: exige inverter os comandos no Traccar e
aceitar o risco do corte por falta de energia. *(Ponto em aberto registrado em `docs/decisoes.md`.)*

Bobina do relé: pino 85/86 — um no fio de saída do relé do J16, o outro no +12 V (mesma alimentação do J16, depois do
fusível). **Confirmar no manual do seu J16** se a saída do relé fecha para o GND (mais comum) ou entrega +12 V.

### 4.3 Alimentação

- O relé do kit é de **12 V**: o DC-DC 12 V é necessário de qualquer forma. Entrada do DC-DC: pack de 72 V chega a **~84 V
  carregado** (20 células × 4,2 V) e tem picos; use conversor com entrada **até 100 V ou mais** (um de "até 80 V" não serve
  para 72 V). 48 V (~54,6 V cheio) e 60 V (~71,4 V cheio) têm mais folga. Fusível de 1–2 A logo na derivação do pack.
- **J16 no DC-DC (12 V)** — mais simples e seguro para a bancada. Consequência conhecida: a "tensão externa" que o J16 mede é
  12 V, não a do pack; a ponte não acha a bateria na curva e, depois de **5 min**, publica **bateria 0%** (log
  `battery_unknown`). A moto pode sumir da busca do app (bateria 0%). Esperado neste modo.
- **J16 direto no pack** (para a bateria % funcionar): só se o manual do **seu** J16 confirmar entrada até pelo menos 90 V
  (há anúncios de "9–90 V DC" para o J16; **confirmar no manual do seu J16**), com fusível. Com pack de 72 V a margem é
  pequena. Peça ao controlador para ajustar `GT06_BATTERY_MODEL` (`48v`, `60v` ou `72v`) ao pack.
- GND do J16, do DC-DC e do relé no **mesmo negativo** do pack/controlador.
- **ACC (ignição):** ligue o ACC no fio da chave **antes** do relé (do lado da chave, não do lado do controlador), para o
  J16 ver a ignição mesmo com o relé cortado. Meça a tensão desse fio: se for a do pack (48–72 V), confirme
  que a entrada ACC do seu J16 aceita essa tensão (**confirmar no manual do seu J16**); se não aceitar, use um relé
  auxiliar/optoacoplador para gerar um sinal de 12 V.

### 4.4 Chip, antena e posição

- Chip inserido **com o J16 desligado**. Teste antes num celular se tem dados.
- O J16 tem antenas internas: a face com o logotipo/etiqueta voltada **para o céu**, sem metal por cima (bagageiro de metal,
  bateria, chassi). Embaixo do banco de plástico costuma funcionar; dentro de caixa metálica, não.
- Prenda o J16 e o relé com abraçadeira, longe de calor do controlador e de água; nada de fio esticado.

---

## 5. Teste de bancada (moto no cavalete, roda livre, céu aberto)

Antes: confirme com o controlador que o provisionamento rodou e peça um `gt06.sh status` (seção 2, item 3). No painel, abra a ficha
da moto: "Rastreador" deve dizer **Só relé**.

| # | Faça | Esperado no painel | Esperado no `status` |
|---|---|---|---|
| 1 | Ligue o J16 e espere 2–3 min | "Último sinal" de segundos atrás; "GPS / 4G" com sinal | dispositivo `online`, ponte vê o dispositivo, última mensagem < 60 s |
| 2 | Compare a posição | moto no lugar certo do mapa | fix do GPS < 10 s |
| 3 | Bateria | % plausível (J16 no pack) ou 0% após 5 min (J16 no DC-DC) | tensão externa presente / `battery_unknown` |
| 4 | Roda **parada**, chave ligada: **Bloquear** | "Aguardando a moto parar para bloquear" por ~10–20 s, depois "confirmado" e **Travada: Sim**; o relé estala e a moto não aciona o motor | fase `waiting_stop` → `cutting` → nenhuma; `blocked=true` |
| 5 | **Desbloquear** | "confirmado" em até 30 s, **Travada: Não**, a moto aciona de novo | `blocked=false` |
| 6 | Bloquear com a moto **desligada** (ACC off) | igual ao 4 | igual |
| 7 | Desligue a energia do J16 com a moto bloqueada, religue | continua **Travada: Sim** depois de reconectar | `blocked=true` após o primeiro heartbeat |
| 8 | Desbloqueie, desligue o J16, peça **Bloquear** no painel, religue em 1 min | "moto offline — será aplicado ao reconectar", depois "Aguardando a moto parar…" e "confirmado" | nunca um corte antes das posições novas |
| 9 | Reinicie o J16 (`RESET#`) bloqueado e desbloqueado | o relé volta ao mesmo estado de antes | — |

**Sobre "roda girando no cavalete":** a velocidade que o sistema usa vem do **GPS**, não da roda. No cavalete o GPS lê ~0 km/h
mesmo com a roda girando, então **o sistema vai cortar** — é seguro (ninguém montado; o controlador só para de acionar), mas
esse teste **não** prova a proteção contra corte em movimento. Para provar, faça o teste 10, rodando de verdade:

| # | Faça | Esperado |
|---|---|---|
| 10 | Em local fechado, sem trânsito, capacete, alguém pilotando a 8–15 km/h em linha reta/círculos. Peça **Bloquear** e **continue andando** | "Aguardando a moto parar para bloquear" o tempo todo; o relé **não** atua. Depois de **120 s**: "falhou: a moto não parou em 120 s; nenhum corte foi enviado" |
| 11 | Peça **Bloquear** de novo, ande ~20 s e **pare** (pé no chão, moto parada) | ~10–20 s depois de parar: corte, "confirmado", **Travada: Sim** |
| 12 | Desbloqueie e confirme que o **controlador limita a 32 km/h** (velocímetro/GPS) | ≤ 32 km/h no plano |

Se o relé atuar com a moto andando no teste 10: **pare os testes**, desligue o J16 e avise o controlador com o horário.

---

## 6. Se algo falhar (sintoma → causa provável → o que fazer)

Peça sempre um `gt06.sh status <moto>` primeiro: ele aponta a maioria destes casos.

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| O J16 não responde aos SMS | chip sem crédito de SMS, senha ativa, aparelho sem rede | teste o chip num celular; tente com senha (3.1); confira o LED de rede |
| `STATUS#` diz `GPRS:Offline` | APN errado, chip sem dados | reenvie o `APN` (3.2 #3, forma `SZCS#APN=` se preciso), `ASETAPN,OFF#`, `RESET#` |
| GPRS online mas o `status` diz "dispositivo não encontrado" ou o J16 nunca aparece | IMEI errado no provisionamento; `SERVER` errado; 5023 fechada | confira o IMEI do `PARAM#` contra o enviado; `GPRSSET#` mostra o servidor; peça ao controlador para conferir `gt06Port` + `GT06_BIND=0.0.0.0` |
| Aparece no Traccar, mas nada no painel; `status`: "o usuário da ponte não vê o dispositivo" | dispositivo não vinculado ao usuário da ponte | controlador roda o `gt06.sh provision` de novo (vincula) |
| `status`: `traccar_unknown_device` | registro da ponte ainda não relido / Tracker não `relay_only` | espere 60 s; se continuar, reprovisionar |
| Online no Traccar, mas o painel não mostra posição; `status`: `telemetry_held awaiting_status` | telemetria **retida**: não chegou heartbeat com o bit de corte depois da conexão | `HBT` ≤ 60 s (3.2 #7, 3.5); espere 1 min |
| `telemetry_held awaiting_battery` e depois **bateria 0%** após 5 min (`battery_unknown`) | J16 não manda tensão externa, ou mede 12 V do DC-DC | `ADT,ON#` + `RESET#`; com DC-DC é esperado (4.3); com pack direto, confira `GT06_BATTERY_MODEL` |
| Nada no painel em local coberto | sem fix de GPS (posição inválida é descartada) | céu aberto; antena para cima, sem metal (4.4) |
| Bloqueio **sempre** termina "a moto não parou em 120 s" com a moto parada | posições a cada > 10 s ou GPS atrasado ≥ 10 s; `status`: "fix do GPS com mais de 10 s" | `TIMER,5,5#` + `RESET#`; confira com `PARAM#`; céu aberto; `SZCS#SLPDISCONNECT=0` |
| Bloqueio fica em "Aguardando a moto parar…" e o J16 está parado | posições paradas mas espaçadas > 10 s, ou velocidade de deriva do GPS ≥ 3 km/h | como acima; espere o GPS estabilizar (1–2 min ligado) |
| Relé atua, mas o painel termina "falhou: sem resposta da moto" e **Travada** não vira Sim | bit de corte não chegou em 120 s: heartbeat lento; ou J16 adiou o corte (sem GPS, ignição ligada, 3.6) | `HBT` ≤ 60 s; céu aberto. A moto **continua cortada**: confira e use **Desbloquear** |
| Nada acontece ao bloquear; `status`: "Traccar versão ... a ponte recusa todo comando de motor" | gate de versão do Traccar (< 6.7.0 ou `version` ilegível) | controlador: imagem `traccar/traccar:6.16.0-ubuntu` (já é a do compose) e conferir `/api/server` |
| Nada acontece ao bloquear; `status` mostra `engine_stop_refused` | segunda guarda da ponte recusou (dispositivo offline, posição velha > 10 s, ≥ 3 km/h, corte já ativo) | ver o motivo no `status`; quase sempre `TIMER`/GPS |
| Bloquear **libera** a moto e Desbloquear bloqueia | relé ligado em NA ou J16 com sentido invertido (3.3, 4.2) | pare; religue em NF (30 + 87a) ou avise o controlador |
| Moto offline das 23:00 às 07:00 | agenda do dev single | normal |
| Funcionava e parou depois de reiniciar a instância | J16 com IP fixo no `SERVER` | use o domínio (3.2 #4) |

---

## 7. Fontes

- Comandos do J16 (`APN`, `Server`, `TIMER` 5–60/5–1800 s, `HBT` 60–300 s, `RELAY`, `STATUS#`, `PARAM#`, `RESET#`):
  <https://www.chinagpstracker.com/blogs/news/j16-gps-tracker>
- Guia brasileiro do J16 (WAYSIS: `ASETAPN,OFF#`, APN Claro/Vivo M2M, `GMT,W,0,0#`, `SERVER,1,<domínio>,<porta>,0#`,
  `TIMER`, `ADT,on#`, `HBT,3,5#`, `RELAY,1#` = bloqueia, `SZCS#SLPDISCONNECT=0`, `SZCS#SOURCE_OFF_TYPE`, `SZCS#GPS_DISSLP`,
  `VERSION#`, `WHERE#`, `GPRSSET#`): <https://clientes.waysis.com.br/index.php?rp=%2Fknowledgebase%2F115%2FJ16.html>
- Softruck, configurar o J16 por SMS (`APN,<apn>,<usuário>,<senha>#`, `SERVER,0,<ip>,<porta>,0#`, `GMT,W,0,0#`, `TIMER`,
  `RELAY,1#` = bloqueia, `RESET#`): <https://ajuda.softruck.com/en/articles/8650890-how-to-configure-the-j16-tracker-via-sms>
- Manual GT06 (corte só abaixo de 20 km/h com GPS fixado; adiado sem GPS; imediato com ignição desligada; `RELAY,1#` = corta):
  <https://device.report/m/e9dba9722d9a5ec9cd0409ba1d6913ca99cecaae78a68de64c8c45b3ed844cb9>
- Concox: `SERVER,0,<ip>,<porta>,0#` (IP) e `SERVER,1,<domínio>,<porta>,0#` (domínio):
  <https://pdfcoffee.com/commandos-concox-pdf-free.html>, <https://gps-trace.com/en/devices/concox-gv20>
- `HBT` em minutos em outros Concox: <https://pdfcoffee.com/concox-gps-tracker-ob22commandsv10-pdf-free.html>,
  <https://www.traccar.org/forums/topic/concox-jm-vl03-location-report-when-engine-off/>
- Senha como primeiro parâmetro quando ativa (Concox): <https://forum.gps-trace.com/d/876-concox-jm-ll01>
- Traccar envia `Relay,1#` (corte) e `Relay,0#` (libera) ao GT06:
  <https://github.com/traccar/traccar/blob/master/src/main/java/org/traccar/protocol/Gt06ProtocolEncoder.java>
- Faixa de alimentação "9–90 V DC" anunciada para o J16 (anúncio de revendedor, não manual):
  <https://www.globalsources.com/Car-GPS/mini-gps-tracker-for-vehicles-1236329043p.htm>
