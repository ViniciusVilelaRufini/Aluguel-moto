# volti_api.model.SendCommandRequest

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**CommandType**](CommandType.md) |  | 
**reason** | **String** | Motivo obrigatório (vai para o AuditLog). | 
**speedLimitKmh** | **int** | Obrigatório quando `type = speed_limit`. Nunca acima de 32 km/h. | [optional] 
**on_** | **bool** | Obrigatório quando `type = stolen_mode` (liga/desliga). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


