# volti_api.model.VehicleModel

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**name** | **String** |  | 
**slug** | **String** |  | 
**categoryLabel** | **String** | Rótulo da categoria (pt-BR). | 
**description** | **String** |  | [optional] 
**photoUrl** | **String** | Link assinado da foto (24 h). Ausente sem foto. | [optional] 
**photoObjectKey** | **String** | staff. Chave do objeto no bucket de catálogo. | [optional] 
**pricePerMinuteCents** | **int** | Preço por minuto do plano `minute` para este modelo. | 
**unlockFeeCents** | **int** | Desbloqueio específico do modelo (ausente = o do plano). | [optional] 
**serviceIntervalKm** | **int** |  | 
**serviceIntervalHours** | **int** |  | 
**active** | **bool** |  | 
**sortOrder** | **int** |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


