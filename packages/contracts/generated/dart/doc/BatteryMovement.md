# volti_api.model.BatteryMovement

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**batteryId** | **String** |  | 
**fromStatus** | [**BatteryStatus**](BatteryStatus.md) |  | [optional] 
**toStatus** | [**BatteryStatus**](BatteryStatus.md) |  | 
**depotId** | **String** |  | [optional] 
**stationId** | **String** |  | [optional] 
**vehicleId** | **String** |  | [optional] 
**actorId** | **String** | Staff que fez a movimentação (cliente na troca por QR). | 
**reason** | **String** |  | [optional] 
**at** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


