# volti_api.model.VehicleModelUpdate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | [optional] 
**categoryLabel** | **String** |  | [optional] 
**description** | **String** |  | [optional] 
**photoObjectKey** | **String** | Chave devolvida por `POST /vehicle-models/uploads` (prefixo `catalog/`). | [optional] 
**pricePerMinuteCents** | **int** |  | [optional] 
**unlockFeeCents** | **int** |  | [optional] 
**inheritPlanUnlockFee** | **bool** | `true` remove o desbloqueio próprio do modelo (volta ao do plano). A API também aceita `unlockFeeCents: null`. | [optional] 
**serviceIntervalKm** | **int** |  | [optional] 
**serviceIntervalHours** | **int** |  | [optional] 
**active** | **bool** |  | [optional] 
**sortOrder** | **int** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


