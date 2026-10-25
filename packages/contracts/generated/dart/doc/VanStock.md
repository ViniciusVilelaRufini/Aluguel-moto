# volti_api.model.VanStock

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**operatorId** | **String** |  | 
**total** | **int** |  | 
**chargedCount** | **int** | `chargePct >= 90`. | 
**depletedCount** | **int** |  | 
**items** | [**BuiltList&lt;Battery&gt;**](Battery.md) |  | 
**loadedChargingSerials** | **BuiltList&lt;String&gt;** | Só em `load`: séries que ainda estavam em `charging` (não prontas); a carga está em `items[].chargePct`. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


