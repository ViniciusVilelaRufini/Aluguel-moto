# J16 na moto real: instalação e teste de aceite

Roteiro para o dia de instalar o Concox J16 (GT06, só relé) numa moto de verdade. O software foi validado na bancada em 2026-11-04. Os comandos do J16 foram confirmados pelo Traccar.

- **Trava:** confirma em 11 a 32 s com GPS válido.
- **Destrava:** confirma em 5 a 7 s.

O que ainda pode falhar no dia está **na instalação física**. Os itens abaixo cobrem isso.

## 1. Ligação elétrica (antes de ligar)

| Fio do J16 | Liga em | Por quê |
|---|---|---|
| Alimentação (+12 V e GND) | **12 V permanente**, de um conversor DC-DC alimentado pelo pack de tração (entrada ≥ 100 V para pack de 72 V, que chega a ~84 V; ver `docs/decisoes.md`) | Se vier da chave, o J16 fica na bateria interna com a moto desligada, que dura poucas horas, e sai do ar. A trava fica "pendente". |
| ACC (ignição) | Linha **comutada pela chave** | É assim que o J16 sabe se a ignição está ligada. O sistema usa esse dado no aviso "ligue a ignição". |
| Relé (contato de corte) | **Em série com o fio de habilitação do controlador** (ou a linha da chave que alimenta o controlador), **nunca no circuito de potência do motor** | Com o relé cortado, girar a chave não pode fazer o motor responder. Cortar a habilitação é seguro em qualquer situação; a regra de nunca cortar em movimento é aplicada pelo software. |

- **Antena GPS:** face de cima voltada para o céu, sem metal por cima e longe dos cabos de potência e do controlador.

**Limite de 32 km/h:** o J16 não controla velocidade. O limite legal de 32 km/h (Resolução Contran 996/2023) precisa estar **configurado no próprio controlador da moto**. Os limites de zona (6 e 20 km/h) aparecem para o cliente só como aviso nessa moto.

## 2. Configuração do J16 (uma vez, pelo Traccar; nunca APN, servidor ou heartbeat)

- `SZCS#GPS_DISSLP=1`: o GPS não dorme com a ignição desligada. Sem isso, a trava falha parada. A resposta esperada é `SETOK: GPS_DISSLP=1, SZCS`.
- Conferir com `STATUS#`: `GPRS:Online`, `GPS:ON`, `ACC` coerente com a chave, `Relay:` 0 ou 1.
- **Não enviar** `SZCS#SLPDISCONNECT=1`: ele desliga o heartbeat com a ignição desligada.

## 3. Cadastro no sistema

- `bash deploy/single/gt06.sh provision VLT-xxxx moto-xxxx <IMEI>` cadastra o rastreador. O IMEI nunca vai para o repositório.
- `bash deploy/single/gt06.sh status moto-xxxx` mostra três coisas: o J16 online no Traccar, a ponte vendo o aparelho e o diagnóstico sem pontos de atenção.

## 4. Teste de aceite (moto no cavalete, roda livre, com alguém segurando)

1. **Bloquear pelo painel** (ficha da moto, "Bloquear"), com a moto parada e o GPS válido: o comando fica "confirmado" em até ~40 s. Gire a chave: **o motor não responde ao acelerador**.
2. **Desbloquear pelo painel:** o comando é confirmado em até ~10 s. Gire a chave: **a moto liga e a roda gira**.
3. **Moto "andando"** (roda girando no cavalete): mande "Bloquear". A trava **não corta** enquanto a velocidade lida não estiver abaixo de 3 km/h. Atenção: no cavalete o GPS lê ~0 km/h e o sistema corta; a prova real de "não corta em movimento" é andando devagar num local aberto.
4. **Ignição desligada por 15 min:** a ficha mostra a linha "GPS" com satélites, e não "Dormindo".
5. **Ciclo completo do cliente:**
   1. pré-reserva no app;
   2. no painel, Retiradas, "Entregar moto", e depois "Contrato e pagamento";
   3. no app, pausar, retomar e devolver;
   4. no painel, "Receber no galpão" ou "Recebida no galpão".
6. **Alarme de furto:** com a moto bloqueada, empurre-a mais de 20 m (ou mais de 150 m depois de um tempo sem GPS). O alerta "Moto em movimento sem aluguel" tem que aparecer em Alertas.

Se o passo 1 falhar (o motor responde com o relé cortado), a ligação do relé está no circuito errado. Refaça o item 1 com um eletricista.
