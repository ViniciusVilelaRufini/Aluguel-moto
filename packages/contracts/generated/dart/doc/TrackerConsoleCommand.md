# volti_api.model.TrackerConsoleCommand

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**vehicleId** | **String** |  | 
**text** | **String** |  | 
**risk** | [**TrackerConsoleRisk**](TrackerConsoleRisk.md) |  | 
**status** | [**TrackerConsoleStatus**](TrackerConsoleStatus.md) |  | 
**failReason** | [**TrackerConsoleFailReason**](TrackerConsoleFailReason.md) |  | 
**response** | **String** | Texto bruto devolvido pelo rastreador. | 
**statusReport** | [**TrackerStatusReport**](TrackerStatusReport.md) | Só quando a resposta é de `STATUS#`. | 
**requestedById** | **String** |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**respondedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


