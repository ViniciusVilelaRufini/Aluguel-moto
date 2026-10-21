# volti_api.model.HealthStatus

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | [**HealthState**](HealthState.md) |  | 
**version** | **String** |  | 
**time** | [**DateTime**](DateTime.md) |  | 
**checks** | [**BuiltMap&lt;String, HealthState&gt;**](HealthState.md) | Estado por dependência (`database`, `redis`, `mqtt`, `storage`). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


