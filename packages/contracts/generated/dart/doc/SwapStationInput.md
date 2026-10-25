# volti_api.model.SwapStationInput

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | 
**address** | **String** |  | 
**lat** | **double** |  | 
**lng** | **double** |  | 
**openingHours** | **String** | Obrigatório sem `open24h` (`400`). | [optional] 
**open24h** | **bool** |  | [optional] [default to false]
**totalSlots** | **int** |  | 
**thingName** | **String** | Padrão `station-{id}`. | [optional] 
**active** | **bool** |  | [optional] [default to true]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


