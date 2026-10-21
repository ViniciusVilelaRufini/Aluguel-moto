# volti_api.model.Vehicle

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**code** | **String** |  | 
**qrCode** | **String** | Conteúdo do QR impresso. | [optional] 
**model** | **String** |  | 
**status** | [**VehicleStatus**](VehicleStatus.md) |  | 
**lat** | **double** |  | 
**lng** | **double** |  | 
**batteryPct** | **int** |  | 
**estimatedRangeKm** | **double** |  | 
**speedLimitKmh** | **int** | Limite atual aplicado (zona ou comando). | 
**thingName** | **String** | staff. | [optional] 
**trackerId** | **String** | staff. | [optional] 
**batterySerial** | **String** | staff. Bateria instalada. | [optional] 
**online** | **bool** | staff. | [optional] 
**locked** | **bool** | staff. | [optional] 
**ignition** | **bool** | staff. | [optional] 
**speedKmh** | **double** | staff. Velocidade reportada. | [optional] 
**signal** | **int** | staff. | [optional] 
**stolenMode** | **bool** | staff. | [optional] 
**firmwareVersion** | **String** | staff. | [optional] 
**lastSeenAt** | [**DateTime**](DateTime.md) | staff. Último sinal. | [optional] 
**currentRentalId** | **String** | staff. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | [optional] 
**updatedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


