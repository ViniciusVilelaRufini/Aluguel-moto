# Decisões

Registro de mudanças de contrato e decisões que fogem da spec. Formato: data · autor · decisão · motivo · status (proposta/aprovada).

## 2026-10-21 · agente 2 (Task 1, contrato) · status: proposta (aprovar junto com o `openapi.yaml`)

Ambiguidades resolvidas ao escrever `packages/contracts/openapi.yaml`:

1. **Caução Pix sem novo `RentalStatus`.** `POST /rentals` com `depositMethod: pix` responde `202` com `RentalStartResult { outcome: awaiting_deposit, deposit.pix }`, sem criar aluguel ativo; depois do pagamento (`GET /payments/deposits/{id}` = `held`) o app chama `POST /rentals` de novo com nova `Idempotency-Key` e `depositId` → `201` `outcome: started`. Motivo: o enum `RentalStatus` é fixo e não tem estado "aguardando caução"; o `rentalId` fica reservado no `Deposit` para atender a assinatura de `holdDeposit`.
2. **"Atual" sempre 200.** `GET /reservations/current` e o novo `GET /rentals/current` devolvem `{ reservation? }` / `{ rental? }` em vez de 404, para o app não tratar ausência como erro.
3. **`nextCursor` ausente na última página** (sem `null`) e nenhum campo `nullable`: o suporte do openapi-generator a OpenAPI 3.1 (beta) é frágil com `type: [x, 'null']`.
4. **Zona como `GeoZone`.** O schema da cerca se chama `GeoZone` (o enum continua `ZoneType`), para não colidir com `Zone` de `dart:async` nos apps Flutter.
5. **Motivo do comando.** `VehicleCommand.reason` é o texto do operador (AuditLog); o motivo técnico (`offline`, `timeout`, `did_not_stop`, `invalid_limit`) é `VehicleCommand.statusReason` (`CommandStatusReason`), que no WebSocket `command.updated` aparece como `reason` (tabela fixa do plano). No Dart, o campo `on` vira `on_` (palavra reservada).
6. **Encerramento forçado.** `POST /rentals/{id}/force-end` liberado para `admin` e `suporte`; fora da zona de devolução só `admin` (403 `force-end-outside-zone-requires-admin`) e soma a taxa `force_end_outside_return_zone` (1500). Leitura de "Encerramento forçado fora da zona de devolução (só admin)".
7. **Endpoints além do mínimo do plano**, para cobrir os prompts 4–7: `PATCH /me`, `POST /me/devices` (FCM), revisão manual de KYC, `GET/POST /vehicles`, `PATCH /vehicles/{id}`, `POST /vehicles/{id}/status` (campo: manutenção/disponível), `GET /vehicles/{id}/track` (replay), `POST /vehicles/{id}/ring` (buzina do cliente com reserva/aluguel), `GET /vehicles/{id}/commands`, `GET /rentals/current`, eventos, troca de moto, recibo, avaliação, compartilhar localização (SOS), resposta do "você está bem?", cauções, assinaturas semanal/mensal, pacotes de minutos e ajuste de carteira (lançamento), coberturas e apólices de seguro, chat de suporte (por polling — sem evento WebSocket na v1), uploads de anexos, início de tarefa de campo, manutenção, dashboard e mapa de calor, lista de restrição (`/customer-restrictions`), usuários internos, consentimentos LGPD.
8. **Consentimento de localização obrigatório.** Sem `locationTracking: true` (`PUT /lgpd/consents`) reservas e aluguéis são recusados (403).
9. **Reserva de 15 minutos** (o prompt 5 fala em 10 a 15).
10. **Grupos por endpoint (`x-required-groups`).** Além da visibilidade do prompt 6: `campo` lê motos, comandos e zonas e muda status da moto; `operacao` e `suporte` listam usuários internos (para atribuir tarefas/alertas); auditoria só `admin`; estornos e ajustes de carteira `admin`/`financeiro`; CPF completo só para `admin`.
11. **Mock exige `Authorization`.** O Prism aplica os esquemas de segurança: o smoke do plano (`curl localhost:4010/vehicles/nearby?...`) responde 401 sem header e 200 com `-H "Authorization: Bearer <qualquer>"`. O header ficou documentado no README do pacote.
12. **Webhook do Mercado Pago** em snake_case (formato do provedor), única exceção à convenção camelCase.
