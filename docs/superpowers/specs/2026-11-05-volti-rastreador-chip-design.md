# Volti — controle do rastreador GT06/J16 e do chip no painel

Data: 2026-11-05. Status: decisões do coordenador (o dono dispensou as perguntas e pediu para implementar).

## Por quê

Em 05/11 o J16 da VLT-0059 ficou ~5 h sem dados: o chip M2M da Algar exigia o APN `indica.algar.br` e o aparelho estava com
`algar.br`. O diagnóstico exigiu CloudShell, SSM, decodificação manual do log do Traccar e cabo USB. O dono quer, no painel:
(1) saber o que está acontecendo com o rastreador, (2) mudar a configuração do J16, (3) ter os dados dos chips.

## Objetivos

1. **Cadastro de chips** (`SimCard`): ICCID, linha, operadora, APN esperado, situação, observações; vinculado a no máximo um
   rastreador (o chip troca de aparelho). A ficha da moto mostra o chip.
2. **Console do rastreador** (só `relay_only`/GT06): o admin envia comandos de texto do J16 pelo painel e vê a resposta.
   Botões prontos de leitura (`STATUS#`, `PARAM#`, `WHERE#`, `APN#`, `SERVER#`, `VERSION#`) e campo livre.
3. **Diagnóstico**: a resposta do `STATUS#` é decodificada (tensões, GPRS, sinal, ACC, GPS, relé, sono) e o painel avisa
   quando o APN informado pelo aparelho difere do APN cadastrado do chip.

## Não objetivos

- Integração com portais/APIs das operadoras (consumo, bloqueio): fica para depois.
- Comandos por SMS (o chip M2M da Algar não recebe SMS).
- Console para rastreadores `speed_control` (firmware próprio, sem comandos de texto).
- Tela de listagem de chips separada: o cadastro e o vínculo ficam na ficha da moto.

## Anti-objetivos (falha mesmo que funcione)

- Um comando aplicado horas depois sem ninguém olhando (fila do Traccar): o console usa `noQueue` e o mesmo gate de versão
  dos comandos de motor; aparelho offline = falha imediata `offline`; Traccar que enfileira (202) = falha `erro` com alerta.
- Cortar ou liberar o relé pelo console, fora do bloqueio seguro (gradual, só abaixo de 3 km/h — CLAUDE.md): o console é
  ALLOWLIST e `RELAY`/`DYD`/`HFYD`/`STOP`/`RESUME` são recusados na API, no painel e na ponte.
- Mudar APN/servidor sem querer e desconectar o aparelho: exigem confirmação explícita.
- Quebrar dados: `GMT` (o servidor espera UTC), reset de fábrica e troca de senha do aparelho são recusados.
- A senha de admin do Traccar chegar à API (teste de infra proíbe): tudo passa pela ponte via MQTT.

## Restrições

- Contrato em `packages/contracts` é a fonte da verdade (OpenAPI + schemas MQTT); decisão registrada em `docs/decisoes.md`.
- Código em inglês, textos de interface em pt-BR; datas UTC ISO 8601; logs JSON sem dados pessoais.
- LGPD: a resposta do `WHERE#` tem posição — o histórico do console expira em 90 dias e é apagado por job diário.
- Sem Docker local; testes unitários locais.

## Abordagens consideradas

1. **API chama a REST do Traccar direto** — mais simples, mas exige a senha de admin do Traccar na API (proibido por teste
   de infra, por isolamento) e não funciona igual no modo aws.
2. **Pela ponte, via MQTT, reaproveitando `motos/+/comandos` e `motos/+/eventos`** — escolhida: sem segredo novo na API,
   sem mudar ACL do Mosquitto nem regras do IoT Core; mesma rota dos outros comandos.
3. Tópicos MQTT novos dedicados (`motos/+/console`) — mais limpo semanticamente, mas exige ACL, política do IoT Core,
   regras e testes de infra novos sem ganho prático.

## Como (decidido)

- MQTT `comandos`: nova `acao: "console"` com `texto`. MQTT `eventos`: novos `tipo` `console_resposta` (`comando_id`,
  `texto`) e `console_falha` (`comando_id`, `motivo`: `offline`|`timeout`|`erro`).
- A ponte envia `type: custom`, `attributes: { data: texto, noQueue: true }` ao Traccar; resposta de texto que não seja do
  relé (`RELAY 0/1 OK`) vira `console_resposta` do comando pendente mais antigo da moto; sem resposta em 60 s, `console_falha`
  `timeout`.
- Ponte, antes de enviar (revisão final): texto de relé/motor → `console_falha` `erro` (defesa em profundidade); gate de
  `noQueue` (Traccar ≥ 6.7.0) não satisfeito → `erro`; status do dispositivo conhecido e não `online` → `offline`. Resposta
  do Traccar: 200 enviado; **202 = enfileirado** (o Traccar ignorou o `noQueue`) → `erro` + log `console_queued_by_traccar`;
  400 (sem sessão) → `offline`; outro erro → `erro`. `comando_id` repetido (reentrega QoS 1) não reenvia. Coerência mínima
  da resposta (FIFO sem correlação): `STATUS#` exige `Battery:`, `WHERE#` `Lati`/`Position`, `PARAM#` `IMEI`, `APN#` `APN`,
  `SERVER#` `SERVER`; senão a resposta não é atribuída (log `console_reply_unmatched`). Com console pendente, resposta sem
  estado do relé não é ack de `engineStop`/`engineResume`.
- API (revisão final): `409` "Há um bloqueio/desbloqueio em andamento nesta moto." com `VehicleCommand` `lock`/`unlock`
  `pending`/`in_progress`; `change`/`connection` com aluguel aberto → `409` "A moto está em aluguel; envie comandos de
  configuração depois do fim do aluguel." (leitura liberada). `console_falha` (vem da ponte) não é sinal de vida do
  rastreador; só `console_resposta` é.
- API: um comando de console pendente por moto (409 se já houver); sem resposta em 90 s o registro vira `failed/timeout`.
- Política do texto (API): 1–100 caracteres, termina em `#`, só `A-Z a-z 0-9 , . - _ : #`; palavra-chave = trecho antes da
  primeira vírgula ou do `#`, comparada em maiúsculas. **ALLOWLIST**: `STATUS`, `PARAM`, `WHERE`, `VERSION`, `GPRSSET` só sem
  vírgula (`read`); `APN`, `SERVER`, `TIMER` sem vírgula (`read`); `TIMER` com vírgula (`change`); `APN`/`SERVER` com vírgula
  e `RESET` sem vírgula (`connection`). Qualquer outro é recusado com "Comando não permitido pelo console."; `RELAY`, `DYD`,
  `HFYD`, `STOP`, `RESUME` com "Use Bloquear/Desbloquear da ficha da moto.". `change` e `connection` exigem `confirm: true`.
  O painel espelha a allowlist só para mostrar o motivo antes de enviar.
- Permissões: chips — leitura `admin`, `operacao`, `suporte`; escrita `admin`. Console — envio e histórico só `admin`.
- Auditoria: criar/editar/vincular chip e enviar comando de console gravam `AuditLog`.
