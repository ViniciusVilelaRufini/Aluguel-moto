# volti_api.model.VehicleServiceInfo

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**odometerKm** | **double** |  | 
**usageHours** | **double** |  | 
**kmSinceService** | **double** |  | 
**hoursSinceService** | **double** |  | 
**serviceIntervalKm** | **int** |  | 
**serviceIntervalHours** | **int** |  | 
**nextServiceAtKm** | **double** | Odômetro da próxima revisão. | 
**nextServiceAtHours** | **double** |  | 
**kmUntilService** | **double** | Negativo quando vencida. | 
**hoursUntilService** | **double** | Negativo quando vencida. | 
**status** | [**VehicleServiceStatus**](VehicleServiceStatus.md) |  | 
**lastServiceAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


