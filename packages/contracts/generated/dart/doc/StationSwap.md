# volti_api.model.StationSwap

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**stationId** | **String** |  | 
**rentalId** | **String** |  | 
**vehicleId** | **String** |  | [optional] 
**status** | [**StationSwapStatus**](StationSwapStatus.md) |  | 
**endReason** | [**StationSwapEndReason**](StationSwapEndReason.md) |  | [optional] 
**slotNumber** | **int** | Vaga aberta (a partir de `awaiting_return`). | [optional] 
**feeCents** | **int** | Taxa da troca (0 nos planos diário/semanal/mensal); cobrada no fechamento do aluguel. | 
**expiresAt** | [**DateTime**](DateTime.md) | Prazo da etapa atual (3 min por etapa). | 
**returnedSerial** | **String** | Nº de série da bateria devolvida. | [optional] 
**returnedPct** | **int** | Carga da bateria devolvida. | [optional] 
**releasedSerial** | **String** | Nº de série da bateria liberada (instalada na moto). | [optional] 
**distanceM** | **int** | Só staff: distância do celular à estação na validação. | [optional] 
**customerId** | **String** | Só staff. | [optional] 
**completedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


