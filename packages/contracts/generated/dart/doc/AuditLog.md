# volti_api.model.AuditLog

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**actorType** | [**ActorType**](ActorType.md) |  | 
**actorId** | **String** |  | [optional] 
**actorName** | **String** |  | [optional] 
**action** | **String** | Ex.: `vehicle.command.lock`, `vehicle.service_unlock`, `rental.force_end`, `zone.update`, `customer.block`, `payment.refund`, `pricing.plan.update`. | 
**entityType** | **String** |  | 
**entityId** | **String** |  | 
**reason** | **String** |  | [optional] 
**metadata** | [**BuiltMap&lt;String, JsonObject&gt;**](JsonObject.md) | Antes/depois ou parâmetros do comando (sem dados pessoais). | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


