# volti_api.model.CreateSimCardRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**iccid** | **String** |  | 
**msisdn** | **String** |  | [optional] 
**carrier** | **String** |  | 
**apn** | **String** |  | [optional] 
**status** | [**SimCardStatus**](SimCardStatus.md) |  | [optional] 
**notes** | **String** |  | [optional] 
**vehicleId** | **String** | Vincula o chip ao rastreador desta moto. | [optional] 
**trackerId** | **String** | Vincula o chip a este rastreador (estoque ou instalado). `vehicleId` e `trackerId` juntos → 400. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


