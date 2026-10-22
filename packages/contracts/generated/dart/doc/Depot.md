# volti_api.model.Depot

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
**district** | **String** | Bairro mostrado no cartão da home. | [optional] 
**lat** | **double** |  | 
**lng** | **double** |  | 
**timezone** | **String** |  | [default to 'America/Sao_Paulo']
**openingHours** | [**BuiltList&lt;DepotOpeningHours&gt;**](DepotOpeningHours.md) | No máximo um intervalo por dia da semana. | 
**pickupNowWindowMinutes** | **int** | Prazo de \"retirar agora\", a partir da reserva. | [default to 120]
**maxScheduleDays** | **int** | Quantos dias à frente o cliente pode agendar. | [default to 7]
**scheduledGraceMinutes** | **int** | Tolerância depois do horário agendado. | [default to 30]
**swapStationId** | **String** | Estação de troca de bateria do próprio galpão (`GET /swap-stations`). | [optional] 
**active** | **bool** |  | 
**availableVehicleCount** | **int** | Motos `free` neste galpão. | [optional] 
**distanceM** | **int** | Só com `lat`/`lng` em `GET /depots`. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | [optional] 
**updatedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


