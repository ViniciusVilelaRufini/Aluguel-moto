# volti_api.model.SwapStationAdmin

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**name** | **String** |  | 
**address** | **String** |  | 
**lat** | **double** |  | 
**lng** | **double** |  | 
**availableBatteries** | **int** | Baterias carregadas prontas para troca. | 
**totalSlots** | **int** |  | 
**openingHours** | **String** |  | 
**open24h** | **bool** |  | 
**active** | **bool** |  | 
**thingName** | **String** | *Thing* do armário no IoT Core (tópicos `estacoes/{thing}/comandos` e `/eventos`). | 
**batteriesInStation** | **int** | Baterias `in_station` registradas nesta estação (carregadas ou não). | 
**openSwaps** | **int** | Trocas por QR em andamento. | 
**depotIds** | **BuiltList&lt;String&gt;** | Galpões ligados a esta estação (`Depot.swapStationId`). | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


