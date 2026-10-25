# volti_api.model.Handover

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**type** | [**HandoverType**](HandoverType.md) |  | 
**depotId** | **String** |  | 
**reservationId** | **String** |  | [optional] 
**rentalId** | **String** | Preenchido no aceite (`pickup`) ou desde a criação (`return_depot`). | [optional] 
**vehicleId** | **String** |  | 
**vehicleCode** | **String** |  | [optional] 
**operatorId** | **String** |  | 
**operatorFirstName** | **String** | Só o primeiro nome cadastrado do operador (\"Entregue por <nome>\"), nunca o nome completo nem algo derivado do e-mail; sem nome cadastrado, \"Equipe Volti\". | [optional] 
**checklist** | [**BuiltList&lt;HandoverChecklistItem&gt;**](HandoverChecklistItem.md) |  | 
**photoKeys** | **BuiltList&lt;String&gt;** |  | 
**photoUrls** | **BuiltList&lt;String&gt;** | Links assinados (24 h), na mesma ordem de `photoKeys`. | [optional] 
**batteryPct** | **int** |  | 
**batterySerial** | **String** |  | [optional] 
**status** | [**HandoverStatus**](HandoverStatus.md) |  | 
**lastError** | **String** | Slug do último erro do aceite (ex.: `payment-declined`); some quando o aceite dá certo. | [optional] 
**disputeReason** | **String** |  | [optional] 
**cancelReason** | **String** | staff. Motivo do cancelamento (`POST /handovers/{id}/cancel`), lido do AuditLog. | [optional] 
**canceledAt** | [**DateTime**](DateTime.md) | staff. Quando foi cancelada. | [optional] 
**canceledByName** | **String** | staff. Nome de quem cancelou. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**respondedAt** | [**DateTime**](DateTime.md) | Aceite ou disputa do cliente. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


