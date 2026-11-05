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

- Um comando aplicado horas depois sem ninguém olhando (fila do Traccar): o console usa `noQueue`; aparelho offline = falha
  imediata `offline`.
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
- API: um comando de console pendente por moto (409 se já houver); sem resposta em 90 s o registro vira `failed/timeout`.
- Política do texto (API): 1–100 caracteres, termina em `#`, só `A-Z a-z 0-9 , . - _ : #`; palavra-chave = trecho antes da
  primeira vírgula ou do `#`, comparada em maiúsculas. Recusados: `GMT`, `FACTORY`, `FORMAT`, `PWD`, `PASSWORD`.
  Risco `read` (sem vírgula), `change` (com vírgula) e `connection` (`APN`/`SERVER` com vírgula, e `RESET`). `change` e
  `connection` exigem `confirm: true`.
- Permissões: chips — leitura `admin`, `operacao`, `suporte`; escrita `admin`. Console — envio e histórico só `admin`.
- Auditoria: criar/editar/vincular chip e enviar comando de console gravam `AuditLog`.
