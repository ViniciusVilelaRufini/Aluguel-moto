# volti_api.model.VehicleServiceRow

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**vehicleId** | **String** |  | 
**vehicleCode** | **String** |  | 
**model** | **String** |  | 
**vehicleStatus** | [**VehicleStatus**](VehicleStatus.md) |  | 
**service** | [**VehicleServiceInfo**](VehicleServiceInfo.md) |  | 
**openMaintenanceTaskId** | **String** | Manutenção preventiva em aberto (agendada ou em andamento). | [optional] 
**scheduledFor** | [**DateTime**](DateTime.md) | Data da manutenção em aberto. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


