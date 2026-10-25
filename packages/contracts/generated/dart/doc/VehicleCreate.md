# volti_api.model.VehicleCreate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **String** |  | 
**model** | **String** |  | 
**thingName** | **String** |  | 
**qrCode** | **String** |  | [optional] 
**batterySerial** | **String** | Série nova (cadastrada instalada) ou de uma bateria `charged` livre no galpão. | [optional] 
**vehicleModelId** | **String** | Define também `model` (nome do modelo). | [optional] 
**depotId** | **String** | Galpão onde a moto entra. Com ele a moto nasce `free` na posição do galpão (disponível para retirada); sem ele, `maintenance`. | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


