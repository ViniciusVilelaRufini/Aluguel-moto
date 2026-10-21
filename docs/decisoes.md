# Decisões

Registro de mudanças de contrato e decisões que fogem da spec. Formato: data · autor · decisão · motivo · status (proposta/aprovada).

## 2026-10-21 · agente 2 (Task 1, contrato) · status: aprovada (2026-10-21, usuário, revisão do contrato no checkpoint da Task 1)

Ambiguidades resolvidas ao escrever `packages/contracts/openapi.yaml`:

1. **Caução Pix sem novo `RentalStatus`.** `POST /rentals` com `depositMethod: pix` responde `202` com `RentalStartResult { outcome: awaiting_deposit, deposit.pix }`, sem criar aluguel ativo; depois do pagamento (`GET /payments/deposits/{id}` = `held`) o app chama `POST /rentals` de novo com nova `Idempotency-Key` e `depositId` → `201` `outcome: started`. Motivo: o enum `RentalStatus` é fixo e não tem estado "aguardando caução"; o `rentalId` fica reservado no `Deposit` para atender a assinatura de `holdDeposit`.
2. **"Atual" sempre 200.** `GET /reservations/current` e o novo `GET /rentals/current` devolvem `{ reservation? }` / `{ rental? }` em vez de 404, para o app não tratar ausência como erro.
3. **`nextCursor` ausente na última página** (sem `null`) e nenhum campo `nullable`: o suporte do openapi-generator a OpenAPI 3.1 (beta) é frágil com `type: [x, 'null']`.
4. **Zona como `GeoZone`.** O schema da cerca se chama `GeoZone` (o enum continua `ZoneType`), para não colidir com `Zone` de `dart:async` nos apps Flutter.
5. **Motivo do comando.** `VehicleCommand.reason` é o texto do operador (AuditLog); o motivo técnico (`offline`, `timeout`, `did_not_stop`, `invalid_limit`) é `VehicleCommand.statusReason` (`CommandStatusReason`), que no WebSocket `command.updated` aparece como `reason` (tabela fixa do plano). No Dart, o campo `on` vira `on_` (palavra reservada).
6. **Encerramento forçado.** `POST /rentals/{id}/force-end` liberado para `admin` e `suporte`; fora da zona de devolução só `admin` (403 `force-end-outside-zone-requires-admin`) e soma a taxa `force_end_outside_return_zone` (1500). Leitura de "Encerramento forçado fora da zona de devolução (só admin)".
7. **Endpoints além do mínimo do plano**, para cobrir os prompts 4–7: `PATCH /me`, `POST /me/devices` (FCM), revisão manual de KYC, `GET/POST /vehicles`, `PATCH /vehicles/{id}`, `POST /vehicles/{id}/status` (campo: manutenção/disponível), `GET /vehicles/{id}/track` (replay), `POST /vehicles/{id}/ring` (buzina do cliente com reserva/aluguel), `GET /vehicles/{id}/commands`, `GET /rentals/current`, eventos, troca de moto, recibo, avaliação, compartilhar localização (SOS), resposta do "você está bem?", cauções, assinaturas semanal/mensal, pacotes de minutos e ajuste de carteira (lançamento), coberturas e apólices de seguro, chat de suporte (por polling — sem evento WebSocket na v1), uploads de anexos, início de tarefa de campo, manutenção, dashboard e mapa de calor, lista de restrição (`/customer-restrictions`), usuários internos, consentimentos LGPD.
8. **Consentimento de localização obrigatório para iniciar o aluguel** (alterada pelo usuário). Sem `locationTracking: true` (`PUT /lgpd/consents`), `POST /rentals` responde `403` `location-consent-required`. Reservar **não** exige o consentimento.
9. **Reserva de 15 minutos** (o prompt 5 fala em 10 a 15).
10. **Grupos por endpoint (`x-required-groups`).** Além da visibilidade do prompt 6: `campo` lê motos, comandos e zonas e muda status da moto; `operacao` e `suporte` listam usuários internos (para atribuir tarefas/alertas); auditoria só `admin`; estornos e ajustes de carteira `admin`/`financeiro`; CPF completo só para `admin`.
11. **Mock exige `Authorization`.** O Prism aplica os esquemas de segurança: o smoke do plano (`curl localhost:4010/vehicles/nearby?...`) responde 401 sem header e 200 com `-H "Authorization: Bearer <qualquer>"`. O header ficou documentado no README do pacote.
12. **Webhook do Mercado Pago** em snake_case (formato do provedor), única exceção à convenção camelCase.
13. **Limitador na inspeção é observação.** `SpeedLimiterCheck.configuredMaxKmh` aceita 0..100 (valor lido no controlador). Acima de 32: `ok: true` → `422` `speed-limiter-noncompliant`; a API abre automaticamente uma manutenção corretiva e um alerta `speed_limiter_noncompliant` e muda a moto para `maintenance` (`Inspection.maintenanceTaskId`/`alertId`). Limites **configuráveis** (comandos, zonas, moto) continuam 0..32.
14. **Todas as 140 operações mantidas** (decisão #7 confirmada).
15. **Slugs de limite de zona.** `reduced_speed` sem `speedLimitKmh` → `422` `zone-speed-limit-required`; 21 a 32 → `422` `zone-speed-limit-invalid`; acima de 32 → `400` (validação do schema).
16. **Reserva no fluxo Pix.** O `202` `awaiting_deposit` cria (ou estende) uma reserva do cliente para a moto até `pix.expiresAt`, com as mesmas regras das reservas. Caução paga cujo aluguel não chega a iniciar (reserva expirada, `409`, cancelamento) é liberada/estornada automaticamente (`DepositStatus` → `released`).
17. **Liquidação única por aluguel.** `POST /rentals/{id}/end` e `/force-end` aceitam `Idempotency-Key` opcional; a liquidação é chaveada por `rentalId` (no máximo uma por aluguel, independentemente de repetições).
18. **Sala `rental:{id}`** do WebSocket vale enquanto o aluguel estiver `active`, `paused` ou `ending` (já descrito em `packages/contracts/realtime.md`).

## 2026-10-21 · agente 2 (Task 3, API) · status: proposta

Decisões tomadas ao implementar `services/api` onde o contrato/spec deixam espaço. Nenhuma altera o `openapi.yaml` (a única mudança de contrato aplicada foi a aprovada: `submitInspection` declara `422`).

1. **Eventos internos adicionais** (além da tabela do plano mestre): `vehicle.status-changed`, `command.changed`, `alert.created`, `rental.changed` (alimentam o WebSocket), `zone.changed` (sincronização do motor de cercas — Task 4), `reservation.ended` e `deposit.release-requested` `{ depositId, customerId, reason }`. **A Task 5 deve consumir `deposit.release-requested`** para liberar/estornar a caução no gateway (decisão #16); o `StubRentalBilling` hoje só marca `released` no banco. Tipos em `services/api/src/common/events.ts`.
2. **Chaves de idempotência das portas:** liquidação `rental-settlement:<rentalId>` (decisão #17) e caução `deposit:<customerId>:<Idempotency-Key>`.
3. **Foto de devolução:** o `returnPhotoObjectKey` do `end` precisa ser igual à chave emitida pelo último `POST /rentals/{id}/return-photo` (a porta `ObjectStorage` não tem `head`; a existência do objeto não é verificada). Proposta: acrescentar `headObject` à porta.
4. **Tempo cobrado no encerramento:** até o pedido de encerramento (`endRequestedAt`), não até a confirmação "travada" — a espera do rastreador não é cobrada.
5. **Regras de preço não explícitas:** `hour`/`day`/`week`/`month` cobram unidades iniciadas sobre o tempo total (pausa inclusa, mínimo 1 unidade); cupom incide só sobre o tempo (não sobre seguro e taxas); percentual arredonda ao centavo mais próximo.
6. **Troca de moto a mais de 200 m:** `422` com slug `validation-error` (o contrato não tem slug específico). Proposta: slug `swap-vehicle-too-far`.
7. **Idempotency-Key em processamento:** segunda requisição concorrente com a mesma chave → `409` slug `conflict` (não listado no contrato).
8. **Usuários internos (`POST /staff`):** gravados só no banco; criar o usuário no pool interno do Cognito (convite + MFA) exige uma porta nova (`StaffDirectory`, local = no-op, aws = `AdminCreateUser`). Proposta para a Task 2/9.
9. **Aluguel/recurso de outro cliente:** `404` (não `403`), para não revelar existência.
10. **Telemetria:** o módulo vehicles grava o estado ao vivo no Redis (`vehicle:live:{id}`) a cada `iot.telemetry` e no Postgres no máximo a cada 30 s por moto. A gravação de `TrackPoint` (só com aluguel ativo) fica com o consumidor da Task 4, para não duplicar pontos.
11. **`DELETE /zones/{id}`:** exclusão lógica (`active: false`, `deletedAt`), preservando o histórico de eventos de cerca.
12. **Webhook do Mercado Pago:** a API valida a assinatura e enfileira com `dedupId`; a deduplicação persistente (`ProcessedWebhook`) e o processamento ficam com a Task 5.
13. **`POST /vehicles`:** moto nova nasce em `maintenance` (até o rastreador ser validado e alguém liberá-la via `POST /vehicles/{id}/status`).
14. **KYC:** CPF na lista de restrição → `422 customer-blocked`; CPF já usado por outra conta → `409 conflict`; chaves de arquivo precisam estar sob `kyc/<customerId>/`.
15. **Teste de contrato:** `jest-openapi` só aceita OpenAPI 3.0; o teste converte o documento 3.1 em memória para 3.0.3 (o contrato não usa construções exclusivas de 3.1), sem alterar nenhum schema.
16. **Imagem do MinIO no compose:** `minio/minio`, `minio/mc` e `quay.io/minio/*` não são mais públicos (verificado em 2026-10-21: pull negado). O compose passa a usar `bitnamilegacy/minio:2025.7.23`, com as mesmas credenciais e dados em `/bitnami/minio/data`. O serviço `minio-init` foi removido: em `STORAGE_MODE=local`, a API cria os buckets na subida (idempotente; `ENSURE_BUCKETS=false` desliga). Em S3 os buckets continuam vindo do CDK. Arquivo compartilhado: a Task 2 deve revisar.
17. **Porta do serviço `api` configurável** (`API_PORT`, padrão 3000), para coexistir com outro processo na 3000.
18. **Migrações:** aplicar sempre com `prisma migrate deploy` (container, README, e2e). A migração inicial tem SQL manual: índices parciais e de expressão e `CHECK`. O índice GIST da zona foi declarado no schema (`@@index([geom], type: Gist)`) e `prisma migrate diff` contra o banco migrado dá migração vazia, então `migrate dev` não remove nada. O setup do e2e/contrato falha se os índices manuais sumirem.
