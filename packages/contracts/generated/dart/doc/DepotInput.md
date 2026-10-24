# volti_api.model.DepotInput

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | 
**address** | **String** |  | 
**district** | **String** |  | [optional] 
**lat** | **double** |  | 
**lng** | **double** |  | 
**timezone** | **String** |  | [optional] [default to 'America/Sao_Paulo']
**openingHours** | [**BuiltList&lt;DepotOpeningHours&gt;**](DepotOpeningHours.md) |  | 
**pickupNowWindowMinutes** | **int** |  | [optional] [default to 120]
**maxScheduleDays** | **int** |  | [optional] [default to 7]
**scheduledGraceMinutes** | **int** |  | [optional] [default to 30]
**swapStationId** | **String** |  | [optional] 
**minChargedBatteries** | **int** | Ausente ou 0 = sem alerta de estoque. | [optional] 
**active** | **bool** |  | [optional] [default to true]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


