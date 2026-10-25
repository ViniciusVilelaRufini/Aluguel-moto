# volti_api.model.DepotUpdate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | [optional] 
**address** | **String** |  | [optional] 
**district** | **String** |  | [optional] 
**lat** | **double** |  | [optional] 
**lng** | **double** |  | [optional] 
**timezone** | **String** |  | [optional] 
**openingHours** | [**BuiltList&lt;DepotOpeningHours&gt;**](DepotOpeningHours.md) |  | [optional] 
**pickupNowWindowMinutes** | **int** |  | [optional] 
**maxScheduleDays** | **int** |  | [optional] 
**scheduledGraceMinutes** | **int** |  | [optional] 
**swapStationId** | **String** | Liga o galpão à estação de troca (inexistente → `400`). | [optional] 
**clearSwapStation** | **bool** | `true` desliga o galpão da estação de troca (o contrato não usa `null`). Junto com `swapStationId` → `400`. | [optional] 
**minChargedBatteries** | **int** | 0 desliga o alerta de estoque. | [optional] 
**active** | **bool** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


