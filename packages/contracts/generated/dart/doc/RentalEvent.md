# volti_api.model.RentalEvent

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**rentalId** | **String** |  | 
**type** | [**RentalEventType**](RentalEventType.md) |  | 
**at** | [**DateTime**](DateTime.md) |  | 
**actorType** | [**ActorType**](ActorType.md) |  | 
**actorId** | **String** |  | [optional] 
**message** | **String** | Texto pt-BR para a linha do tempo. | [optional] 
**data** | [**BuiltMap&lt;String, JsonObject&gt;**](JsonObject.md) | Detalhes por tipo (ex. `{ zoneId, zoneType, speedLimitKmh }`, `{ fromVehicleId, toVehicleId }`). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


