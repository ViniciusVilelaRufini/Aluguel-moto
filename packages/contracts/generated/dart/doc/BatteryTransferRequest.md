# volti_api.model.BatteryTransferRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**serials** | **BuiltList&lt;String&gt;** |  | 
**stationId** | **String** | Só em `unload`; ausente = `charging`. | [optional] 
**chargePct** | **int** | Só em `load`; carga informada (padrão 100). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


