# volti_api (EXPERIMENTAL)
Contrato REST da plataforma Volti. Este arquivo é a **fonte da verdade**: a API NestJS, o painel
(cliente TypeScript gerado) e os apps Flutter (pacote Dart `volti_api` gerado) seguem este contrato.
Mudanças depois da aprovação da Task 1 são propostas em `docs/decisoes.md` e aprovadas pelo usuário.

## Regras não negociáveis
- Velocidade máxima absoluta: **32 km/h**. Todo `speedLimitKmh` aceita só `0..32`; valores fora
  disso são rejeitados com `400` (`speed-limit-out-of-range`), nunca truncados.
- Zonas `reduced_speed`: 6 km/h (pedestres) ou 20 km/h (ciclovias), sempre `speedLimitKmh <= 20`.
- Bloqueio seguro: o rastreador só trava abaixo de 3 km/h; antes disso o limite é reduzido em rampa.
- LGPD: trajetos só durante o aluguel e com consentimento; expiram após 90 dias; o cliente exporta e
  exclui os próprios dados.
- Dados de cartão nunca passam pelo backend: só tokens do gateway (`cardToken`).

## Convenções
- Campos em inglês, camelCase. Dinheiro em centavos (`amountCents`, `...Cents`, inteiros, BRL).
- Datas em UTC ISO 8601 (`format: date-time`); a exibição usa `America/Sao_Paulo`.
- IDs são UUID. O código visível da moto é `VLT-0001` (também impresso no QR).
- Paginação por cursor: `?cursor=&limit=` → `{ items, nextCursor }`. `nextCursor` fica **ausente** na
  última página.
- `Idempotency-Key` (header) é obrigatório em `POST /rentals`, `POST /swap-stations/{id}/swaps` e nos POST de pagamento. A mesma chave
  com o mesmo corpo devolve a mesma resposta sem repetir o efeito; com corpo diferente → `422`
  (`idempotency-key-reused`). Chaves valem por 24 h.
- Rate limiting global; acima do limite → `429` com `Retry-After`.

## Erros (RFC 7807)
Todo erro é `application/problem+json` (schema `Problem`). O campo `type` é
`https://api.volti.com.br/problems/<slug>`. Slugs conhecidos:
`validation-error`, `unauthorized`, `forbidden`, `not-found`, `rate-limited`, `idempotency-key-reused`,
`speed-limit-out-of-range`, `kyc-not-approved`, `kyc-underage`, `customer-blocked`,
`customer-delinquent`, `vehicle-unavailable`, `vehicle-offline`, `reservation-already-active`,
`rental-already-active`, `rental-not-active`, `rental-outside-return-zone`, `return-photo-missing`,
`rental-lock-not-confirmed`, `force-end-outside-zone-requires-admin`, `insurance-required`,
`coupon-invalid`, `deposit-not-held`, `payment-failed`, `card-not-found`, `zone-invalid-geometry`,
`zone-speed-limit-required`, `zone-speed-limit-invalid`, `location-consent-required`,
`speed-limiter-noncompliant`, `battery-serials-must-differ`, `account-deletion-blocked`,
`webhook-signature-invalid`, `pix-key-invalid`, `top-up-amount-out-of-range`, `subscription-not-pausable`,
`subscription-pause-limit-reached`, `subscription-required`, `subscription-vehicle-required`,
`maintenance-slot-unavailable`, `referral-code-invalid`, `referral-not-eligible`, `gateway-unavailable`,
`subscription-vehicle-cooldown`, `reservation-open`, `pickup-outside-hours`, `pickup-too-far-ahead`,
`depot-inactive`, `handover-not-pending`, `payment-declined`, `reservation-in-handover`, `station-not-found`,
`station-unavailable`, `vehicle-moving`, `too-far`, `swap-open`, `swap-not-cancelable`.

## Autenticação e grupos
- `customerAuth`: JWT do User Pool de clientes (Cognito) ou, com `AUTH_MODE=dev`, emitido por
  `POST /dev/token` com `pool: customer`.
- `staffAuth`: JWT do User Pool interno (MFA obrigatório), claim `cognito:groups` com valores de
  `StaffGroup`. Em dev, `POST /dev/token` com `pool: staff`.
- A extensão `x-required-groups` em cada operação de staff lista os grupos que podem chamá-la
  (basta pertencer a um deles). Quando a operação aceita os dois esquemas, a lista vale só para
  tokens de staff. Visibilidade: `admin` tudo; `operacao` frota, cercas, alertas e campo;
  `financeiro` financeiro, relatórios e aluguéis (leitura); `suporte` clientes, aluguéis e
  suporte; `campo` tarefas de campo e destravar em serviço.
- Dados pessoais são minimizados por grupo: CPF completo só para `admin`; os demais recebem
  `***.456.789-**`.

## Tempo real
Eventos WebSocket (Socket.IO, namespace `/realtime`) estão em `packages/contracts/realtime.md`. Os eventos da
entrega no galpão (`handover.*`) também estão descritos na extensão `x-ws-events` deste arquivo.

## Retirada em galpão
As motos ficam num galpão (`Depot`). Disponível para retirada = `status: free` com `depotId` preenchido.
O cliente reserva com `POST /reservations` informando `depotId` (retirar agora ou agendar); o operador lê o
`pickupCode`, faz o checklist de saída (`POST /handovers`) e o cliente confere e aceita
(`POST /handovers/{id}/accept`), o que cria o aluguel, cobra o plano e destrava a moto.
**Moto do galpão só sai pela entrega:** moto com `depotId`, ou separada por uma reserva de galpão, responde
`409` `vehicle-unavailable` em `POST /rentals` e na reserva de rua (sem `depotId`), e some do
`GET /vehicles/nearby` do cliente (assim como `awaiting_pickup`).


This Dart package is automatically generated by the [OpenAPI Generator](https://openapi-generator.tech) project:

- API version: 0.1.0
- Generator version: 7.25.0
- Build package: org.openapitools.codegen.languages.DartDioClientCodegen

## Requirements

* Dart 2.15.0+ or Flutter 2.8.0+
* Dio 5.0.0+ (https://pub.dev/packages/dio)

## Installation & Usage

### pub.dev
To use the package from [pub.dev](https://pub.dev), please include the following in pubspec.yaml
```yaml
dependencies:
  volti_api: 0.1.0
```

### Github
If this Dart package is published to Github, please include the following in pubspec.yaml
```yaml
dependencies:
  volti_api:
    git:
      url: https://github.com/GIT_USER_ID/GIT_REPO_ID.git
      #ref: main
```

### Local development
To use the package from your local drive, please include the following in pubspec.yaml
```yaml
dependencies:
  volti_api:
    path: /path/to/volti_api
```

## Getting Started

Please follow the [installation procedure](#installation--usage) and then run the following:

```dart
import 'package:volti_api/volti_api.dart';


final api = VoltiApi().getAlertsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final AlertAssignRequest alertAssignRequest = ; // AlertAssignRequest | 

try {
    final response = await api.assignAlert(id, alertAssignRequest);
    print(response);
} on DioException catch (e) {
    print("Exception when calling AlertsApi->assignAlert: $e\n");
}

```

## Documentation for API Endpoints

All URIs are relative to *http://localhost:3000*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
[*AlertsApi*](doc/AlertsApi.md) | [**assignAlert**](doc/AlertsApi.md#assignalert) | **POST** /alerts/{id}/assign | Atribuir alerta
[*AlertsApi*](doc/AlertsApi.md) | [**getAlert**](doc/AlertsApi.md#getalert) | **GET** /alerts/{id} | Detalhe do alerta
[*AlertsApi*](doc/AlertsApi.md) | [**listAlerts**](doc/AlertsApi.md#listalerts) | **GET** /alerts | Fila de alertas
[*AlertsApi*](doc/AlertsApi.md) | [**resolveAlert**](doc/AlertsApi.md#resolvealert) | **POST** /alerts/{id}/resolve | Resolver alerta
[*AuditApi*](doc/AuditApi.md) | [**listAuditLogs**](doc/AuditApi.md#listauditlogs) | **GET** /audit-logs | Log de auditoria
[*AuthApi*](doc/AuthApi.md) | [**createDevToken**](doc/AuthApi.md#createdevtoken) | **POST** /dev/token | Emitir token de desenvolvimento
[*AuthApi*](doc/AuthApi.md) | [**getMe**](doc/AuthApi.md#getme) | **GET** /me | Usuário autenticado
[*AuthApi*](doc/AuthApi.md) | [**registerDevice**](doc/AuthApi.md#registerdevice) | **POST** /me/devices | Registrar dispositivo para push (FCM)
[*AuthApi*](doc/AuthApi.md) | [**updateMe**](doc/AuthApi.md#updateme) | **PATCH** /me | Atualizar o próprio perfil (cliente)
[*BatteriesApi*](doc/BatteriesApi.md) | [**getVanStock**](doc/BatteriesApi.md#getvanstock) | **GET** /batteries/van-stock | Estoque de baterias na van do operador
[*BatteriesApi*](doc/BatteriesApi.md) | [**listBatteries**](doc/BatteriesApi.md#listbatteries) | **GET** /batteries | Baterias (série, carga, ciclos, onde estão)
[*BatteriesApi*](doc/BatteriesApi.md) | [**loadVanBatteries**](doc/BatteriesApi.md#loadvanbatteries) | **POST** /batteries/van-stock/load | Carregar baterias na van
[*BatteriesApi*](doc/BatteriesApi.md) | [**unloadVanBatteries**](doc/BatteriesApi.md#unloadvanbatteries) | **POST** /batteries/van-stock/unload | Descarregar baterias da van
[*CatalogApi*](doc/CatalogApi.md) | [**createVehicleModel**](doc/CatalogApi.md#createvehiclemodel) | **POST** /vehicle-models | Cadastrar modelo
[*CatalogApi*](doc/CatalogApi.md) | [**createVehicleModelPhotoUpload**](doc/CatalogApi.md#createvehiclemodelphotoupload) | **POST** /vehicle-models/uploads | URL de upload da foto do modelo
[*CatalogApi*](doc/CatalogApi.md) | [**listVehicleModels**](doc/CatalogApi.md#listvehiclemodels) | **GET** /vehicle-models | Catálogo de modelos (\&quot;Escolha sua moto\&quot;)
[*CatalogApi*](doc/CatalogApi.md) | [**updateVehicleModel**](doc/CatalogApi.md#updatevehiclemodel) | **PATCH** /vehicle-models/{id} | Editar modelo (preço, foto, intervalo de revisão)
[*CommandsApi*](doc/CommandsApi.md) | [**getCommand**](doc/CommandsApi.md#getcommand) | **GET** /commands/{id} | Estado do comando
[*CommandsApi*](doc/CommandsApi.md) | [**listVehicleCommands**](doc/CommandsApi.md#listvehiclecommands) | **GET** /vehicles/{id}/commands | Histórico de comandos da moto
[*CommandsApi*](doc/CommandsApi.md) | [**sendVehicleCommand**](doc/CommandsApi.md#sendvehiclecommand) | **POST** /vehicles/{id}/commands | Enviar comando à moto
[*CustomersApi*](doc/CustomersApi.md) | [**addRestriction**](doc/CustomersApi.md#addrestriction) | **POST** /customer-restrictions | Incluir CPF na lista de restrição
[*CustomersApi*](doc/CustomersApi.md) | [**blockCustomer**](doc/CustomersApi.md#blockcustomer) | **POST** /customers/{id}/block | Bloquear conta
[*CustomersApi*](doc/CustomersApi.md) | [**getCustomer**](doc/CustomersApi.md#getcustomer) | **GET** /customers/{id} | Ficha do cliente
[*CustomersApi*](doc/CustomersApi.md) | [**listCustomers**](doc/CustomersApi.md#listcustomers) | **GET** /customers | Buscar clientes
[*CustomersApi*](doc/CustomersApi.md) | [**listRestrictions**](doc/CustomersApi.md#listrestrictions) | **GET** /customer-restrictions | Lista de restrição
[*CustomersApi*](doc/CustomersApi.md) | [**removeRestriction**](doc/CustomersApi.md#removerestriction) | **DELETE** /customer-restrictions/{id} | Remover CPF da lista de restrição
[*CustomersApi*](doc/CustomersApi.md) | [**unblockCustomer**](doc/CustomersApi.md#unblockcustomer) | **POST** /customers/{id}/unblock | Desbloquear conta
[*DepotsApi*](doc/DepotsApi.md) | [**createDepot**](doc/DepotsApi.md#createdepot) | **POST** /depots | Cadastrar galpão
[*DepotsApi*](doc/DepotsApi.md) | [**getDepot**](doc/DepotsApi.md#getdepot) | **GET** /depots/{id} | Galpão
[*DepotsApi*](doc/DepotsApi.md) | [**listDepotPickups**](doc/DepotsApi.md#listdepotpickups) | **GET** /depots/{id}/pickups | Agenda de retiradas do dia
[*DepotsApi*](doc/DepotsApi.md) | [**listDepotVehicles**](doc/DepotsApi.md#listdepotvehicles) | **GET** /depots/{id}/vehicles | Motos do galpão (\&quot;Escolher moto\&quot;)
[*DepotsApi*](doc/DepotsApi.md) | [**listDepots**](doc/DepotsApi.md#listdepots) | **GET** /depots | Galpões (home do cliente e painel)
[*DepotsApi*](doc/DepotsApi.md) | [**updateDepot**](doc/DepotsApi.md#updatedepot) | **PATCH** /depots/{id} | Editar galpão (horários, prazos, ativo)
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**completeFieldTask**](doc/FieldTasksApi.md#completefieldtask) | **POST** /field-tasks/{id}/complete | Concluir tarefa
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**createFieldTask**](doc/FieldTasksApi.md#createfieldtask) | **POST** /field-tasks | Criar tarefa de campo
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**createFieldTaskUpload**](doc/FieldTasksApi.md#createfieldtaskupload) | **POST** /field-tasks/uploads | URL pré-assinada para foto de inspeção
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**getFieldTask**](doc/FieldTasksApi.md#getfieldtask) | **GET** /field-tasks/{id} | Detalhe da tarefa
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**listFieldTasks**](doc/FieldTasksApi.md#listfieldtasks) | **GET** /field-tasks | Listar tarefas de campo
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**serviceUnlockVehicle**](doc/FieldTasksApi.md#serviceunlockvehicle) | **POST** /vehicles/{id}/service-unlock | Destravar em modo serviço
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**startFieldTask**](doc/FieldTasksApi.md#startfieldtask) | **POST** /field-tasks/{id}/start | Iniciar tarefa
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**submitBatterySwap**](doc/FieldTasksApi.md#submitbatteryswap) | **POST** /field-tasks/{id}/battery-swap | Registrar troca de bateria
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**submitInspection**](doc/FieldTasksApi.md#submitinspection) | **POST** /field-tasks/{id}/inspection | Registrar checklist de inspeção
[*FieldTasksApi*](doc/FieldTasksApi.md) | [**updateFieldTask**](doc/FieldTasksApi.md#updatefieldtask) | **PATCH** /field-tasks/{id} | Atualizar ou atribuir tarefa
[*HandoversApi*](doc/HandoversApi.md) | [**acceptHandover**](doc/HandoversApi.md#accepthandover) | **POST** /handovers/{id}/accept | Aceitar a moto e destravar
[*HandoversApi*](doc/HandoversApi.md) | [**cancelHandover**](doc/HandoversApi.md#cancelhandover) | **POST** /handovers/{id}/cancel | Cancelar a entrega de saída (operação)
[*HandoversApi*](doc/HandoversApi.md) | [**createHandover**](doc/HandoversApi.md#createhandover) | **POST** /handovers | Registrar entrega (saída ou chegada no galpão)
[*HandoversApi*](doc/HandoversApi.md) | [**createHandoverPhotoUpload**](doc/HandoversApi.md#createhandoverphotoupload) | **POST** /handovers/uploads | URL de upload da foto da entrega
[*HandoversApi*](doc/HandoversApi.md) | [**disputeHandover**](doc/HandoversApi.md#disputehandover) | **POST** /handovers/{id}/dispute | Apontar problema na moto
[*HandoversApi*](doc/HandoversApi.md) | [**getHandover**](doc/HandoversApi.md#gethandover) | **GET** /handovers/{id} | Entrega (\&quot;Confira sua moto\&quot;)
[*HandoversApi*](doc/HandoversApi.md) | [**listHandovers**](doc/HandoversApi.md#listhandovers) | **GET** /handovers | Entregas (operação, painel e disputas)
[*HealthApi*](doc/HealthApi.md) | [**getHealth**](doc/HealthApi.md#gethealth) | **GET** /health | Saúde do serviço
[*InsuranceApi*](doc/InsuranceApi.md) | [**getInsurancePolicy**](doc/InsuranceApi.md#getinsurancepolicy) | **GET** /insurance/policies/{id} | Detalhe da apólice
[*InsuranceApi*](doc/InsuranceApi.md) | [**listInsuranceCoverages**](doc/InsuranceApi.md#listinsurancecoverages) | **GET** /insurance/coverages | Coberturas de seguro
[*InsuranceApi*](doc/InsuranceApi.md) | [**listInsurancePolicies**](doc/InsuranceApi.md#listinsurancepolicies) | **GET** /insurance/policies | Apólices emitidas
[*InsuranceApi*](doc/InsuranceApi.md) | [**updateInsuranceCoverage**](doc/InsuranceApi.md#updateinsurancecoverage) | **PUT** /insurance/coverages/{coverage} | Configurar cobertura
[*KycApi*](doc/KycApi.md) | [**createKycUploads**](doc/KycApi.md#createkycuploads) | **POST** /kyc/uploads | URLs pré-assinadas para documento e selfie
[*KycApi*](doc/KycApi.md) | [**getKycStatus**](doc/KycApi.md#getkycstatus) | **GET** /kyc/status | Status da verificação
[*KycApi*](doc/KycApi.md) | [**reviewCustomerKyc**](doc/KycApi.md#reviewcustomerkyc) | **POST** /customers/{id}/kyc-review | Revisão manual da verificação
[*KycApi*](doc/KycApi.md) | [**submitKyc**](doc/KycApi.md#submitkyc) | **POST** /kyc/submit | Enviar verificação de identidade
[*LgpdApi*](doc/LgpdApi.md) | [**deleteMyAccount**](doc/LgpdApi.md#deletemyaccount) | **DELETE** /lgpd/account | Excluir minha conta
[*LgpdApi*](doc/LgpdApi.md) | [**exportMyData**](doc/LgpdApi.md#exportmydata) | **GET** /lgpd/export | Exportar meus dados
[*LgpdApi*](doc/LgpdApi.md) | [**getConsents**](doc/LgpdApi.md#getconsents) | **GET** /lgpd/consents | Consentimentos do cliente
[*LgpdApi*](doc/LgpdApi.md) | [**updateConsents**](doc/LgpdApi.md#updateconsents) | **PUT** /lgpd/consents | Registrar consentimentos (termos e localização)
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**cancelMyMaintenanceRequest**](doc/MaintenanceApi.md#cancelmymaintenancerequest) | **DELETE** /me/maintenance-requests/{id} | Cancelar manutenção agendada
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**createMaintenanceTask**](doc/MaintenanceApi.md#createmaintenancetask) | **POST** /maintenance/tasks | Agendar manutenção
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**createMyMaintenanceRequest**](doc/MaintenanceApi.md#createmymaintenancerequest) | **POST** /me/maintenance-requests | Agendar manutenção da moto fixa do plano
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**getMaintenanceTask**](doc/MaintenanceApi.md#getmaintenancetask) | **GET** /maintenance/tasks/{id} | Detalhe da manutenção
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**listMaintenanceTasks**](doc/MaintenanceApi.md#listmaintenancetasks) | **GET** /maintenance/tasks | Listar manutenções
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**listMyMaintenanceRequests**](doc/MaintenanceApi.md#listmymaintenancerequests) | **GET** /me/maintenance-requests | Manutenções agendadas pelo cliente
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**listMyMaintenanceSlots**](doc/MaintenanceApi.md#listmymaintenanceslots) | **GET** /me/maintenance-slots | Horários livres para manutenção (plano semanal/mensal)
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**listVehicleServiceStatus**](doc/MaintenanceApi.md#listvehicleservicestatus) | **GET** /maintenance/vehicles | Manutenção preventiva por km/horas (tabela \&quot;Manutenção\&quot;)
[*MaintenanceApi*](doc/MaintenanceApi.md) | [**updateMaintenanceTask**](doc/MaintenanceApi.md#updatemaintenancetask) | **PATCH** /maintenance/tasks/{id} | Atualizar manutenção
[*PaymentsApi*](doc/PaymentsApi.md) | [**addPaymentCard**](doc/PaymentsApi.md#addpaymentcard) | **POST** /payments/cards | Cadastrar cartão (token do gateway)
[*PaymentsApi*](doc/PaymentsApi.md) | [**assignSubscriptionVehicle**](doc/PaymentsApi.md#assignsubscriptionvehicle) | **PUT** /payments/subscriptions/{id}/vehicle | Definir a moto fixa do plano
[*PaymentsApi*](doc/PaymentsApi.md) | [**cancelSubscription**](doc/PaymentsApi.md#cancelsubscription) | **DELETE** /payments/subscriptions/{id} | Cancelar assinatura
[*PaymentsApi*](doc/PaymentsApi.md) | [**createSubscription**](doc/PaymentsApi.md#createsubscription) | **POST** /payments/subscriptions | Assinar plano semanal ou mensal
[*PaymentsApi*](doc/PaymentsApi.md) | [**deletePaymentCard**](doc/PaymentsApi.md#deletepaymentcard) | **DELETE** /payments/cards/{id} | Remover cartão
[*PaymentsApi*](doc/PaymentsApi.md) | [**getDeposit**](doc/PaymentsApi.md#getdeposit) | **GET** /payments/deposits/{id} | Estado da caução
[*PaymentsApi*](doc/PaymentsApi.md) | [**getPayment**](doc/PaymentsApi.md#getpayment) | **GET** /payments/{id} | Detalhe do pagamento
[*PaymentsApi*](doc/PaymentsApi.md) | [**getSubscription**](doc/PaymentsApi.md#getsubscription) | **GET** /payments/subscriptions/{id} | Detalhe da assinatura (próxima cobrança, pausa, moto fixa)
[*PaymentsApi*](doc/PaymentsApi.md) | [**listDeposits**](doc/PaymentsApi.md#listdeposits) | **GET** /payments/deposits | Listar cauções
[*PaymentsApi*](doc/PaymentsApi.md) | [**listPaymentCards**](doc/PaymentsApi.md#listpaymentcards) | **GET** /payments/cards | Cartões do cliente
[*PaymentsApi*](doc/PaymentsApi.md) | [**listPayments**](doc/PaymentsApi.md#listpayments) | **GET** /payments | Listar pagamentos
[*PaymentsApi*](doc/PaymentsApi.md) | [**listSubscriptions**](doc/PaymentsApi.md#listsubscriptions) | **GET** /payments/subscriptions | Assinaturas do cliente (planos semanal e mensal)
[*PaymentsApi*](doc/PaymentsApi.md) | [**pauseSubscription**](doc/PaymentsApi.md#pausesubscription) | **POST** /payments/subscriptions/{id}/pause | Pausar assinatura
[*PaymentsApi*](doc/PaymentsApi.md) | [**refundPayment**](doc/PaymentsApi.md#refundpayment) | **POST** /payments/{id}/refund | Estornar pagamento
[*PaymentsApi*](doc/PaymentsApi.md) | [**resumeSubscription**](doc/PaymentsApi.md#resumesubscription) | **POST** /payments/subscriptions/{id}/resume | Retomar assinatura pausada
[*PricingApi*](doc/PricingApi.md) | [**addMyCoupon**](doc/PricingApi.md#addmycoupon) | **POST** /me/coupons | Adicionar cupom à conta
[*PricingApi*](doc/PricingApi.md) | [**createCoupon**](doc/PricingApi.md#createcoupon) | **POST** /pricing/coupons | Criar cupom
[*PricingApi*](doc/PricingApi.md) | [**createFee**](doc/PricingApi.md#createfee) | **POST** /pricing/fees | Criar taxa
[*PricingApi*](doc/PricingApi.md) | [**createPricingPlan**](doc/PricingApi.md#createpricingplan) | **POST** /pricing/plans | Criar plano
[*PricingApi*](doc/PricingApi.md) | [**deleteCoupon**](doc/PricingApi.md#deletecoupon) | **DELETE** /pricing/coupons/{id} | Desativar cupom
[*PricingApi*](doc/PricingApi.md) | [**deleteFee**](doc/PricingApi.md#deletefee) | **DELETE** /pricing/fees/{id} | Desativar taxa
[*PricingApi*](doc/PricingApi.md) | [**deletePricingPlan**](doc/PricingApi.md#deletepricingplan) | **DELETE** /pricing/plans/{id} | Desativar plano
[*PricingApi*](doc/PricingApi.md) | [**getCoupon**](doc/PricingApi.md#getcoupon) | **GET** /pricing/coupons/{id} | Detalhe do cupom
[*PricingApi*](doc/PricingApi.md) | [**getPricingPlan**](doc/PricingApi.md#getpricingplan) | **GET** /pricing/plans/{id} | Detalhe do plano
[*PricingApi*](doc/PricingApi.md) | [**listCoupons**](doc/PricingApi.md#listcoupons) | **GET** /pricing/coupons | Listar cupons
[*PricingApi*](doc/PricingApi.md) | [**listFees**](doc/PricingApi.md#listfees) | **GET** /pricing/fees | Listar taxas
[*PricingApi*](doc/PricingApi.md) | [**listMyCoupons**](doc/PricingApi.md#listmycoupons) | **GET** /me/coupons | Cupons salvos na conta
[*PricingApi*](doc/PricingApi.md) | [**listPricingPlans**](doc/PricingApi.md#listpricingplans) | **GET** /pricing/plans | Planos disponíveis
[*PricingApi*](doc/PricingApi.md) | [**quotePrice**](doc/PricingApi.md#quoteprice) | **POST** /pricing/quote | Cotar aluguel
[*PricingApi*](doc/PricingApi.md) | [**updateCoupon**](doc/PricingApi.md#updatecoupon) | **PUT** /pricing/coupons/{id} | Atualizar cupom
[*PricingApi*](doc/PricingApi.md) | [**updateFee**](doc/PricingApi.md#updatefee) | **PUT** /pricing/fees/{id} | Atualizar taxa
[*PricingApi*](doc/PricingApi.md) | [**updatePricingPlan**](doc/PricingApi.md#updatepricingplan) | **PUT** /pricing/plans/{id} | Atualizar plano
[*PricingApi*](doc/PricingApi.md) | [**validateMyCoupon**](doc/PricingApi.md#validatemycoupon) | **POST** /me/coupons/validate | Validar cupom sem salvar
[*ReferralsApi*](doc/ReferralsApi.md) | [**getMyReferral**](doc/ReferralsApi.md#getmyreferral) | **GET** /me/referral | Programa de indicação do cliente
[*ReferralsApi*](doc/ReferralsApi.md) | [**listMyReferralRewards**](doc/ReferralsApi.md#listmyreferralrewards) | **GET** /me/referral/rewards | Recompensas de indicação
[*ReferralsApi*](doc/ReferralsApi.md) | [**redeemReferralCode**](doc/ReferralsApi.md#redeemreferralcode) | **POST** /me/referral/redeem | Usar código de indicação de um amigo
[*RentalsApi*](doc/RentalsApi.md) | [**createReturnPhotoUpload**](doc/RentalsApi.md#createreturnphotoupload) | **POST** /rentals/{id}/return-photo | URL pré-assinada para a foto de devolução
[*RentalsApi*](doc/RentalsApi.md) | [**endRental**](doc/RentalsApi.md#endrental) | **POST** /rentals/{id}/end | Encerrar aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**forceEndRental**](doc/RentalsApi.md#forceendrental) | **POST** /rentals/{id}/force-end | Encerramento forçado (staff)
[*RentalsApi*](doc/RentalsApi.md) | [**getCurrentRental**](doc/RentalsApi.md#getcurrentrental) | **GET** /rentals/current | Aluguel em andamento do cliente
[*RentalsApi*](doc/RentalsApi.md) | [**getRental**](doc/RentalsApi.md#getrental) | **GET** /rentals/{id} | Detalhe do aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**getRentalReceipt**](doc/RentalsApi.md#getrentalreceipt) | **GET** /rentals/{id}/receipt | Recibo do aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**getRentalTrack**](doc/RentalsApi.md#getrentaltrack) | **GET** /rentals/{id}/track | Trajeto do aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**listRentalEvents**](doc/RentalsApi.md#listrentalevents) | **GET** /rentals/{id}/events | Linha do tempo do aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**listRentals**](doc/RentalsApi.md#listrentals) | **GET** /rentals | Listar aluguéis
[*RentalsApi*](doc/RentalsApi.md) | [**pauseRental**](doc/RentalsApi.md#pauserental) | **POST** /rentals/{id}/pause | Pausar aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**rateRental**](doc/RentalsApi.md#raterental) | **POST** /rentals/{id}/rating | Avaliar aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**respondWellbeingCheck**](doc/RentalsApi.md#respondwellbeingcheck) | **POST** /rentals/{id}/wellbeing | Responder \&quot;você está bem?\&quot;
[*RentalsApi*](doc/RentalsApi.md) | [**resumeRental**](doc/RentalsApi.md#resumerental) | **POST** /rentals/{id}/resume | Retomar aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**shareRentalLocation**](doc/RentalsApi.md#sharerentallocation) | **POST** /rentals/{id}/location-share | Compartilhar localização (SOS)
[*RentalsApi*](doc/RentalsApi.md) | [**startRental**](doc/RentalsApi.md#startrental) | **POST** /rentals | Iniciar aluguel
[*RentalsApi*](doc/RentalsApi.md) | [**swapRentalVehicle**](doc/RentalsApi.md#swaprentalvehicle) | **POST** /rentals/{id}/swap | Trocar de moto
[*ReportsApi*](doc/ReportsApi.md) | [**getDashboardSummary**](doc/ReportsApi.md#getdashboardsummary) | **GET** /reports/dashboard | Resumo do dashboard
[*ReportsApi*](doc/ReportsApi.md) | [**getDemandHeatmap**](doc/ReportsApi.md#getdemandheatmap) | **GET** /reports/demand-heatmap | Mapa de calor de demanda
[*ReportsApi*](doc/ReportsApi.md) | [**getFinanceReport**](doc/ReportsApi.md#getfinancereport) | **GET** /reports/finance | Financeiro (cauções, inadimplência, repasses de seguro)
[*ReportsApi*](doc/ReportsApi.md) | [**getOccupancyReport**](doc/ReportsApi.md#getoccupancyreport) | **GET** /reports/occupancy | Ocupação da frota
[*ReportsApi*](doc/ReportsApi.md) | [**getRevenuePerVehicleReport**](doc/ReportsApi.md#getrevenuepervehiclereport) | **GET** /reports/revenue-per-vehicle | Receita por moto por dia
[*ReportsApi*](doc/ReportsApi.md) | [**getRevenueReport**](doc/ReportsApi.md#getrevenuereport) | **GET** /reports/revenue | Receita por período e plano
[*ReservationsApi*](doc/ReservationsApi.md) | [**cancelReservation**](doc/ReservationsApi.md#cancelreservation) | **DELETE** /reservations/{id} | Cancelar reserva
[*ReservationsApi*](doc/ReservationsApi.md) | [**createReservation**](doc/ReservationsApi.md#createreservation) | **POST** /reservations | Reservar moto
[*ReservationsApi*](doc/ReservationsApi.md) | [**getCurrentReservation**](doc/ReservationsApi.md#getcurrentreservation) | **GET** /reservations/current | Reserva ativa do cliente
[*StaffApi*](doc/StaffApi.md) | [**createStaffUser**](doc/StaffApi.md#createstaffuser) | **POST** /staff | Convidar usuário interno
[*StaffApi*](doc/StaffApi.md) | [**getStaffUser**](doc/StaffApi.md#getstaffuser) | **GET** /staff/{id} | Detalhe do usuário interno
[*StaffApi*](doc/StaffApi.md) | [**listStaffUsers**](doc/StaffApi.md#liststaffusers) | **GET** /staff | Usuários internos
[*StaffApi*](doc/StaffApi.md) | [**updateStaffUser**](doc/StaffApi.md#updatestaffuser) | **PATCH** /staff/{id} | Alterar grupos ou desativar usuário interno
[*StationsApi*](doc/StationsApi.md) | [**cancelStationSwap**](doc/StationsApi.md#cancelstationswap) | **POST** /swap-stations/{id}/swaps/{swapId}/cancel | Cancelar troca na estação
[*StationsApi*](doc/StationsApi.md) | [**createStationSwap**](doc/StationsApi.md#createstationswap) | **POST** /swap-stations/{id}/swaps | Iniciar troca de bateria na estação (QR)
[*StationsApi*](doc/StationsApi.md) | [**getStationSwap**](doc/StationsApi.md#getstationswap) | **GET** /swap-stations/{id}/swaps/{swapId} | Consultar troca na estação
[*StationsApi*](doc/StationsApi.md) | [**getSwapStationQr**](doc/StationsApi.md#getswapstationqr) | **GET** /swap-stations/{id}/qr | QR da estação (admin)
[*StationsApi*](doc/StationsApi.md) | [**listStationSwaps**](doc/StationsApi.md#liststationswaps) | **GET** /swap-stations/{id}/swaps | Trocas da estação (painel)
[*StationsApi*](doc/StationsApi.md) | [**listSwapStations**](doc/StationsApi.md#listswapstations) | **GET** /swap-stations | Estações de troca de bateria (mapa)
[*SupportApi*](doc/SupportApi.md) | [**createClaim**](doc/SupportApi.md#createclaim) | **POST** /support/claims | Abrir sinistro
[*SupportApi*](doc/SupportApi.md) | [**createDispute**](doc/SupportApi.md#createdispute) | **POST** /support/disputes | Contestar cobrança
[*SupportApi*](doc/SupportApi.md) | [**createIncident**](doc/SupportApi.md#createincident) | **POST** /support/incidents | Reportar problema
[*SupportApi*](doc/SupportApi.md) | [**createSupportConversation**](doc/SupportApi.md#createsupportconversation) | **POST** /support/conversations | Abrir conversa com o suporte
[*SupportApi*](doc/SupportApi.md) | [**createSupportUpload**](doc/SupportApi.md#createsupportupload) | **POST** /support/uploads | URL pré-assinada para anexo (incidente, sinistro, chat)
[*SupportApi*](doc/SupportApi.md) | [**getClaim**](doc/SupportApi.md#getclaim) | **GET** /support/claims/{id} | Detalhe do sinistro
[*SupportApi*](doc/SupportApi.md) | [**getDispute**](doc/SupportApi.md#getdispute) | **GET** /support/disputes/{id} | Detalhe da contestação
[*SupportApi*](doc/SupportApi.md) | [**getIncident**](doc/SupportApi.md#getincident) | **GET** /support/incidents/{id} | Detalhe do incidente
[*SupportApi*](doc/SupportApi.md) | [**listClaims**](doc/SupportApi.md#listclaims) | **GET** /support/claims | Listar sinistros
[*SupportApi*](doc/SupportApi.md) | [**listDisputes**](doc/SupportApi.md#listdisputes) | **GET** /support/disputes | Listar contestações
[*SupportApi*](doc/SupportApi.md) | [**listIncidents**](doc/SupportApi.md#listincidents) | **GET** /support/incidents | Listar incidentes
[*SupportApi*](doc/SupportApi.md) | [**listSupportConversations**](doc/SupportApi.md#listsupportconversations) | **GET** /support/conversations | Conversas do chat de suporte
[*SupportApi*](doc/SupportApi.md) | [**listSupportMessages**](doc/SupportApi.md#listsupportmessages) | **GET** /support/conversations/{id}/messages | Mensagens da conversa
[*SupportApi*](doc/SupportApi.md) | [**markSupportConversationRead**](doc/SupportApi.md#marksupportconversationread) | **POST** /support/conversations/{id}/read | Marcar mensagens como lidas
[*SupportApi*](doc/SupportApi.md) | [**resolveDispute**](doc/SupportApi.md#resolvedispute) | **POST** /support/disputes/{id}/resolve | Decidir contestação
[*SupportApi*](doc/SupportApi.md) | [**sendSupportMessage**](doc/SupportApi.md#sendsupportmessage) | **POST** /support/conversations/{id}/messages | Enviar mensagem
[*SupportApi*](doc/SupportApi.md) | [**updateClaim**](doc/SupportApi.md#updateclaim) | **PATCH** /support/claims/{id} | Atualizar status do sinistro
[*SupportApi*](doc/SupportApi.md) | [**updateIncident**](doc/SupportApi.md#updateincident) | **PATCH** /support/incidents/{id} | Atualizar status do incidente
[*SupportApi*](doc/SupportApi.md) | [**updateSupportConversation**](doc/SupportApi.md#updatesupportconversation) | **PATCH** /support/conversations/{id} | Encerrar ou reabrir conversa
[*VehiclesApi*](doc/VehiclesApi.md) | [**createVehicle**](doc/VehiclesApi.md#createvehicle) | **POST** /vehicles | Cadastrar moto
[*VehiclesApi*](doc/VehiclesApi.md) | [**getVehicle**](doc/VehiclesApi.md#getvehicle) | **GET** /vehicles/{id} | Ficha da moto
[*VehiclesApi*](doc/VehiclesApi.md) | [**getVehicleByCode**](doc/VehiclesApi.md#getvehiclebycode) | **GET** /vehicles/by-code/{code} | Moto pelo código (QR ou número)
[*VehiclesApi*](doc/VehiclesApi.md) | [**getVehicleTrack**](doc/VehiclesApi.md#getvehicletrack) | **GET** /vehicles/{id}/track | Trajeto da moto no período (replay)
[*VehiclesApi*](doc/VehiclesApi.md) | [**listNearbyVehicles**](doc/VehiclesApi.md#listnearbyvehicles) | **GET** /vehicles/nearby | Motos próximas
[*VehiclesApi*](doc/VehiclesApi.md) | [**listVehicles**](doc/VehiclesApi.md#listvehicles) | **GET** /vehicles | Listar frota
[*VehiclesApi*](doc/VehiclesApi.md) | [**ringVehicle**](doc/VehiclesApi.md#ringvehicle) | **POST** /vehicles/{id}/ring | Buzinar e piscar (cliente)
[*VehiclesApi*](doc/VehiclesApi.md) | [**setVehicleStatus**](doc/VehiclesApi.md#setvehiclestatus) | **POST** /vehicles/{id}/status | Mudar status operacional (manutenção ou disponível)
[*VehiclesApi*](doc/VehiclesApi.md) | [**updateVehicle**](doc/VehiclesApi.md#updatevehicle) | **PATCH** /vehicles/{id} | Editar moto
[*WalletApi*](doc/WalletApi.md) | [**createWalletAdjustment**](doc/WalletApi.md#createwalletadjustment) | **POST** /customers/{id}/wallet/adjustments | Ajuste manual da carteira (lançamento)
[*WalletApi*](doc/WalletApi.md) | [**createWalletTopUp**](doc/WalletApi.md#createwallettopup) | **POST** /wallet/top-ups | Recarregar carteira
[*WalletApi*](doc/WalletApi.md) | [**getWallet**](doc/WalletApi.md#getwallet) | **GET** /wallet | Saldo da carteira
[*WalletApi*](doc/WalletApi.md) | [**getWalletTopUp**](doc/WalletApi.md#getwallettopup) | **GET** /wallet/top-ups/{id} | Estado da recarga
[*WalletApi*](doc/WalletApi.md) | [**listMinutePackages**](doc/WalletApi.md#listminutepackages) | **GET** /wallet/packages | Pacotes de minutos à venda
[*WalletApi*](doc/WalletApi.md) | [**listWalletLedger**](doc/WalletApi.md#listwalletledger) | **GET** /wallet/ledger | Extrato da carteira
[*WebhooksApi*](doc/WebhooksApi.md) | [**receiveMercadoPagoWebhook**](doc/WebhooksApi.md#receivemercadopagowebhook) | **POST** /webhooks/mercadopago | Webhook do Mercado Pago
[*ZonesApi*](doc/ZonesApi.md) | [**createZone**](doc/ZonesApi.md#createzone) | **POST** /zones | Criar cerca
[*ZonesApi*](doc/ZonesApi.md) | [**deleteZone**](doc/ZonesApi.md#deletezone) | **DELETE** /zones/{id} | Excluir cerca
[*ZonesApi*](doc/ZonesApi.md) | [**getZone**](doc/ZonesApi.md#getzone) | **GET** /zones/{id} | Detalhe da cerca
[*ZonesApi*](doc/ZonesApi.md) | [**listZones**](doc/ZonesApi.md#listzones) | **GET** /zones | Listar cercas
[*ZonesApi*](doc/ZonesApi.md) | [**updateZone**](doc/ZonesApi.md#updatezone) | **PUT** /zones/{id} | Substituir cerca


## Documentation For Models

 - [AccountDeletion](doc/AccountDeletion.md)
 - [AccountDeletionStatus](doc/AccountDeletionStatus.md)
 - [ActorType](doc/ActorType.md)
 - [Alert](doc/Alert.md)
 - [AlertAssignRequest](doc/AlertAssignRequest.md)
 - [AlertPage](doc/AlertPage.md)
 - [AlertPriority](doc/AlertPriority.md)
 - [AlertResolveRequest](doc/AlertResolveRequest.md)
 - [AlertStatus](doc/AlertStatus.md)
 - [AlertType](doc/AlertType.md)
 - [AuditLog](doc/AuditLog.md)
 - [AuditLogPage](doc/AuditLogPage.md)
 - [AuthPool](doc/AuthPool.md)
 - [Battery](doc/Battery.md)
 - [BatteryPage](doc/BatteryPage.md)
 - [BatteryStatus](doc/BatteryStatus.md)
 - [BatterySwap](doc/BatterySwap.md)
 - [BatterySwapRequest](doc/BatterySwapRequest.md)
 - [BatteryTransferRequest](doc/BatteryTransferRequest.md)
 - [ChecklistItem](doc/ChecklistItem.md)
 - [Claim](doc/Claim.md)
 - [ClaimCreate](doc/ClaimCreate.md)
 - [ClaimPage](doc/ClaimPage.md)
 - [ClaimStatus](doc/ClaimStatus.md)
 - [ClaimType](doc/ClaimType.md)
 - [ClaimUpdate](doc/ClaimUpdate.md)
 - [CommandStatus](doc/CommandStatus.md)
 - [CommandStatusReason](doc/CommandStatusReason.md)
 - [CommandType](doc/CommandType.md)
 - [Consents](doc/Consents.md)
 - [ConsentsUpdate](doc/ConsentsUpdate.md)
 - [ConversationStatus](doc/ConversationStatus.md)
 - [Coupon](doc/Coupon.md)
 - [CouponCodeRequest](doc/CouponCodeRequest.md)
 - [CouponInput](doc/CouponInput.md)
 - [CouponPage](doc/CouponPage.md)
 - [CouponValidation](doc/CouponValidation.md)
 - [CoverageItem](doc/CoverageItem.md)
 - [CurrentRental](doc/CurrentRental.md)
 - [CurrentReservation](doc/CurrentReservation.md)
 - [Customer](doc/Customer.md)
 - [CustomerBlockRequest](doc/CustomerBlockRequest.md)
 - [CustomerCoupon](doc/CustomerCoupon.md)
 - [CustomerCouponList](doc/CustomerCouponList.md)
 - [CustomerCouponSource](doc/CustomerCouponSource.md)
 - [CustomerCouponStatus](doc/CustomerCouponStatus.md)
 - [CustomerMaintenanceRequest](doc/CustomerMaintenanceRequest.md)
 - [CustomerMaintenanceRequestCreate](doc/CustomerMaintenanceRequestCreate.md)
 - [CustomerMaintenanceRequestList](doc/CustomerMaintenanceRequestList.md)
 - [CustomerPage](doc/CustomerPage.md)
 - [CustomerStats](doc/CustomerStats.md)
 - [CustomerStatus](doc/CustomerStatus.md)
 - [DashboardSummary](doc/DashboardSummary.md)
 - [DemandHeatmap](doc/DemandHeatmap.md)
 - [Deposit](doc/Deposit.md)
 - [DepositMethod](doc/DepositMethod.md)
 - [DepositPage](doc/DepositPage.md)
 - [DepositStatus](doc/DepositStatus.md)
 - [Depot](doc/Depot.md)
 - [DepotInput](doc/DepotInput.md)
 - [DepotList](doc/DepotList.md)
 - [DepotOpeningHours](doc/DepotOpeningHours.md)
 - [DepotPickupList](doc/DepotPickupList.md)
 - [DepotUpdate](doc/DepotUpdate.md)
 - [DepotVehicleList](doc/DepotVehicleList.md)
 - [DevTokenRequest](doc/DevTokenRequest.md)
 - [DevTokenResponse](doc/DevTokenResponse.md)
 - [DevicePlatform](doc/DevicePlatform.md)
 - [DeviceRegistration](doc/DeviceRegistration.md)
 - [DiscountType](doc/DiscountType.md)
 - [Dispute](doc/Dispute.md)
 - [DisputeCreate](doc/DisputeCreate.md)
 - [DisputeDecision](doc/DisputeDecision.md)
 - [DisputePage](doc/DisputePage.md)
 - [DisputeResolveRequest](doc/DisputeResolveRequest.md)
 - [DisputeStatus](doc/DisputeStatus.md)
 - [DocumentType](doc/DocumentType.md)
 - [EndRentalRequest](doc/EndRentalRequest.md)
 - [Fee](doc/Fee.md)
 - [FeeInput](doc/FeeInput.md)
 - [FeeList](doc/FeeList.md)
 - [FieldTask](doc/FieldTask.md)
 - [FieldTaskCompleteRequest](doc/FieldTaskCompleteRequest.md)
 - [FieldTaskCreate](doc/FieldTaskCreate.md)
 - [FieldTaskPage](doc/FieldTaskPage.md)
 - [FieldTaskStatus](doc/FieldTaskStatus.md)
 - [FieldTaskType](doc/FieldTaskType.md)
 - [FieldTaskUpdate](doc/FieldTaskUpdate.md)
 - [FinanceReport](doc/FinanceReport.md)
 - [ForceEndRentalRequest](doc/ForceEndRentalRequest.md)
 - [GeoJsonPolygon](doc/GeoJsonPolygon.md)
 - [GeoJsonPolygonType](doc/GeoJsonPolygonType.md)
 - [GeoZone](doc/GeoZone.md)
 - [GeoZoneInput](doc/GeoZoneInput.md)
 - [GeoZoneList](doc/GeoZoneList.md)
 - [Handover](doc/Handover.md)
 - [HandoverCancel](doc/HandoverCancel.md)
 - [HandoverChecklistItem](doc/HandoverChecklistItem.md)
 - [HandoverCreate](doc/HandoverCreate.md)
 - [HandoverDispute](doc/HandoverDispute.md)
 - [HandoverPage](doc/HandoverPage.md)
 - [HandoverStatus](doc/HandoverStatus.md)
 - [HandoverType](doc/HandoverType.md)
 - [HealthState](doc/HealthState.md)
 - [HealthStatus](doc/HealthStatus.md)
 - [HeatmapPoint](doc/HeatmapPoint.md)
 - [Incident](doc/Incident.md)
 - [IncidentCategory](doc/IncidentCategory.md)
 - [IncidentCreate](doc/IncidentCreate.md)
 - [IncidentPage](doc/IncidentPage.md)
 - [IncidentStatus](doc/IncidentStatus.md)
 - [IncidentUpdate](doc/IncidentUpdate.md)
 - [Inspection](doc/Inspection.md)
 - [InspectionRequest](doc/InspectionRequest.md)
 - [InsuranceCoverage](doc/InsuranceCoverage.md)
 - [InsuranceCoverageOption](doc/InsuranceCoverageOption.md)
 - [InsuranceCoverageOptionList](doc/InsuranceCoverageOptionList.md)
 - [InsuranceCoverageUpdate](doc/InsuranceCoverageUpdate.md)
 - [InsurancePolicy](doc/InsurancePolicy.md)
 - [InsurancePolicyPage](doc/InsurancePolicyPage.md)
 - [KycDecision](doc/KycDecision.md)
 - [KycReviewRequest](doc/KycReviewRequest.md)
 - [KycStatus](doc/KycStatus.md)
 - [KycStatusResponse](doc/KycStatusResponse.md)
 - [KycSubmitRequest](doc/KycSubmitRequest.md)
 - [KycUploadRequest](doc/KycUploadRequest.md)
 - [KycUploads](doc/KycUploads.md)
 - [LgpdExport](doc/LgpdExport.md)
 - [LocationShare](doc/LocationShare.md)
 - [LocationShareRequest](doc/LocationShareRequest.md)
 - [MaintenanceKind](doc/MaintenanceKind.md)
 - [MaintenanceSlot](doc/MaintenanceSlot.md)
 - [MaintenanceSlotList](doc/MaintenanceSlotList.md)
 - [MaintenanceSource](doc/MaintenanceSource.md)
 - [MaintenanceStatus](doc/MaintenanceStatus.md)
 - [MaintenanceTask](doc/MaintenanceTask.md)
 - [MaintenanceTaskCreate](doc/MaintenanceTaskCreate.md)
 - [MaintenanceTaskPage](doc/MaintenanceTaskPage.md)
 - [MaintenanceTaskUpdate](doc/MaintenanceTaskUpdate.md)
 - [Me](doc/Me.md)
 - [MeUpdate](doc/MeUpdate.md)
 - [MercadoPagoWebhookData](doc/MercadoPagoWebhookData.md)
 - [MercadoPagoWebhookEvent](doc/MercadoPagoWebhookEvent.md)
 - [MessageAuthorType](doc/MessageAuthorType.md)
 - [MinutePackage](doc/MinutePackage.md)
 - [MinutePackageList](doc/MinutePackageList.md)
 - [NearbyVehicles](doc/NearbyVehicles.md)
 - [OccupancyReport](doc/OccupancyReport.md)
 - [OccupancyRow](doc/OccupancyRow.md)
 - [Payment](doc/Payment.md)
 - [PaymentCard](doc/PaymentCard.md)
 - [PaymentCardCreate](doc/PaymentCardCreate.md)
 - [PaymentCardList](doc/PaymentCardList.md)
 - [PaymentKind](doc/PaymentKind.md)
 - [PaymentMethod](doc/PaymentMethod.md)
 - [PaymentPage](doc/PaymentPage.md)
 - [PaymentStatus](doc/PaymentStatus.md)
 - [PickupMode](doc/PickupMode.md)
 - [PixCharge](doc/PixCharge.md)
 - [PixKeyType](doc/PixKeyType.md)
 - [PlanCode](doc/PlanCode.md)
 - [PlanRevenue](doc/PlanRevenue.md)
 - [PlanUnit](doc/PlanUnit.md)
 - [PolicyStatus](doc/PolicyStatus.md)
 - [PresignedUpload](doc/PresignedUpload.md)
 - [PriceBreakdown](doc/PriceBreakdown.md)
 - [PriceLine](doc/PriceLine.md)
 - [PricingPlan](doc/PricingPlan.md)
 - [PricingPlanInput](doc/PricingPlanInput.md)
 - [PricingPlanList](doc/PricingPlanList.md)
 - [Problem](doc/Problem.md)
 - [Quote](doc/Quote.md)
 - [QuoteRequest](doc/QuoteRequest.md)
 - [RatingRequest](doc/RatingRequest.md)
 - [ReasonRequest](doc/ReasonRequest.md)
 - [Receipt](doc/Receipt.md)
 - [ReferralRedeemRequest](doc/ReferralRedeemRequest.md)
 - [ReferralRedemption](doc/ReferralRedemption.md)
 - [ReferralReward](doc/ReferralReward.md)
 - [ReferralRewardPage](doc/ReferralRewardPage.md)
 - [ReferralRewardStatus](doc/ReferralRewardStatus.md)
 - [ReferralSummary](doc/ReferralSummary.md)
 - [RefundRequest](doc/RefundRequest.md)
 - [Rental](doc/Rental.md)
 - [RentalEvent](doc/RentalEvent.md)
 - [RentalEventList](doc/RentalEventList.md)
 - [RentalEventType](doc/RentalEventType.md)
 - [RentalPage](doc/RentalPage.md)
 - [RentalStartOutcome](doc/RentalStartOutcome.md)
 - [RentalStartResult](doc/RentalStartResult.md)
 - [RentalStatus](doc/RentalStatus.md)
 - [ReportFormat](doc/ReportFormat.md)
 - [ReportGroupBy](doc/ReportGroupBy.md)
 - [Reservation](doc/Reservation.md)
 - [ReservationCreate](doc/ReservationCreate.md)
 - [ReservationStatus](doc/ReservationStatus.md)
 - [RestrictionEntry](doc/RestrictionEntry.md)
 - [RestrictionEntryCreate](doc/RestrictionEntryCreate.md)
 - [RestrictionEntryPage](doc/RestrictionEntryPage.md)
 - [RevenueReport](doc/RevenueReport.md)
 - [RevenueRow](doc/RevenueRow.md)
 - [SendCommandRequest](doc/SendCommandRequest.md)
 - [ServiceUnlockRequest](doc/ServiceUnlockRequest.md)
 - [ServiceVehicleStatus](doc/ServiceVehicleStatus.md)
 - [SpeedLimiterCheck](doc/SpeedLimiterCheck.md)
 - [StaffGroup](doc/StaffGroup.md)
 - [StaffUser](doc/StaffUser.md)
 - [StaffUserCreate](doc/StaffUserCreate.md)
 - [StaffUserPage](doc/StaffUserPage.md)
 - [StaffUserUpdate](doc/StaffUserUpdate.md)
 - [StartRentalRequest](doc/StartRentalRequest.md)
 - [StationSwap](doc/StationSwap.md)
 - [StationSwapEndReason](doc/StationSwapEndReason.md)
 - [StationSwapPage](doc/StationSwapPage.md)
 - [StationSwapRequest](doc/StationSwapRequest.md)
 - [StationSwapStatus](doc/StationSwapStatus.md)
 - [Subscription](doc/Subscription.md)
 - [SubscriptionCreate](doc/SubscriptionCreate.md)
 - [SubscriptionList](doc/SubscriptionList.md)
 - [SubscriptionPauseRequest](doc/SubscriptionPauseRequest.md)
 - [SubscriptionPlanCode](doc/SubscriptionPlanCode.md)
 - [SubscriptionStatus](doc/SubscriptionStatus.md)
 - [SubscriptionVehicleAssignment](doc/SubscriptionVehicleAssignment.md)
 - [SupportConversation](doc/SupportConversation.md)
 - [SupportConversationCreate](doc/SupportConversationCreate.md)
 - [SupportConversationPage](doc/SupportConversationPage.md)
 - [SupportConversationUpdate](doc/SupportConversationUpdate.md)
 - [SupportMessage](doc/SupportMessage.md)
 - [SupportMessageCreate](doc/SupportMessageCreate.md)
 - [SupportMessagePage](doc/SupportMessagePage.md)
 - [SupportMessageStatus](doc/SupportMessageStatus.md)
 - [SupportReadRequest](doc/SupportReadRequest.md)
 - [SwapStation](doc/SwapStation.md)
 - [SwapStationList](doc/SwapStationList.md)
 - [SwapStationQr](doc/SwapStationQr.md)
 - [SwapVehicleRequest](doc/SwapVehicleRequest.md)
 - [TaskPriority](doc/TaskPriority.md)
 - [TopUp](doc/TopUp.md)
 - [TopUpMethod](doc/TopUpMethod.md)
 - [TopUpRequest](doc/TopUpRequest.md)
 - [TopUpStatus](doc/TopUpStatus.md)
 - [Track](doc/Track.md)
 - [TrackPoint](doc/TrackPoint.md)
 - [UploadContentType](doc/UploadContentType.md)
 - [UploadRequest](doc/UploadRequest.md)
 - [ValidationIssue](doc/ValidationIssue.md)
 - [VanStock](doc/VanStock.md)
 - [Vehicle](doc/Vehicle.md)
 - [VehicleCommand](doc/VehicleCommand.md)
 - [VehicleCommandPage](doc/VehicleCommandPage.md)
 - [VehicleCreate](doc/VehicleCreate.md)
 - [VehicleModel](doc/VehicleModel.md)
 - [VehicleModelInput](doc/VehicleModelInput.md)
 - [VehicleModelList](doc/VehicleModelList.md)
 - [VehicleModelUpdate](doc/VehicleModelUpdate.md)
 - [VehiclePage](doc/VehiclePage.md)
 - [VehicleRevenueReport](doc/VehicleRevenueReport.md)
 - [VehicleRevenueRow](doc/VehicleRevenueRow.md)
 - [VehicleServiceInfo](doc/VehicleServiceInfo.md)
 - [VehicleServicePage](doc/VehicleServicePage.md)
 - [VehicleServiceRow](doc/VehicleServiceRow.md)
 - [VehicleServiceStatus](doc/VehicleServiceStatus.md)
 - [VehicleStatus](doc/VehicleStatus.md)
 - [VehicleStatusChange](doc/VehicleStatusChange.md)
 - [VehicleStatusCounts](doc/VehicleStatusCounts.md)
 - [VehicleSummary](doc/VehicleSummary.md)
 - [VehicleUpdate](doc/VehicleUpdate.md)
 - [Wallet](doc/Wallet.md)
 - [WalletAdjustmentRequest](doc/WalletAdjustmentRequest.md)
 - [WalletEntry](doc/WalletEntry.md)
 - [WalletEntryPage](doc/WalletEntryPage.md)
 - [WalletEntryType](doc/WalletEntryType.md)
 - [WebhookAck](doc/WebhookAck.md)
 - [WellbeingResponse](doc/WellbeingResponse.md)
 - [ZoneType](doc/ZoneType.md)


## Documentation For Authorization


Authentication schemes defined for the API:
### customerAuth

- **Type**: HTTP Bearer Token authentication (JWT)

### staffAuth

- **Type**: HTTP Bearer Token authentication (JWT)


## Author

dev@volti.com.br

