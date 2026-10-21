# volti_api.model.Alert

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**type** | [**AlertType**](AlertType.md) |  | 
**priority** | [**AlertPriority**](AlertPriority.md) |  | 
**status** | [**AlertStatus**](AlertStatus.md) |  | 
**vehicleId** | **String** |  | [optional] 
**vehicleCode** | **String** |  | [optional] 
**rentalId** | **String** |  | [optional] 
**message** | **String** | Texto pt-BR. | 
**lat** | **double** |  | [optional] 
**lng** | **double** |  | [optional] 
**assigneeId** | **String** |  | [optional] 
**assigneeName** | **String** |  | [optional] 
**resolution** | **String** |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**assignedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**resolvedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


