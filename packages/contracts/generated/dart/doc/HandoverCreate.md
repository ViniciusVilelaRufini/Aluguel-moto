# volti_api.model.HandoverCreate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**HandoverType**](HandoverType.md) |  | 
**depotId** | **String** | Galpão onde a entrega acontece. Obrigatório em `return_depot` (`400`); em `pickup` precisa ser o da reserva, quando enviado. | [optional] 
**pickupCode** | **String** | Só em `pickup` (obrigatório): conteúdo do QR da reserva. | [optional] 
**rentalId** | **String** | Só em `return_depot` (obrigatório): aluguel que chega. | [optional] 
**checklist** | [**BuiltList&lt;HandoverChecklistItem&gt;**](HandoverChecklistItem.md) |  | 
**photoKeys** | **BuiltList&lt;String&gt;** | Chaves devolvidas por `POST /handovers/uploads` (prefixo `handovers/`). | 
**batteryPct** | **int** |  | 
**batterySerial** | **String** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


