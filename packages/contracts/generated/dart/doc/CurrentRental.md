# volti_api.model.CurrentRental

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rental** | [**Rental**](Rental.md) |  | [optional] 
**currentStationSwap** | [**StationSwap**](StationSwap.md) | Troca de bateria na estação em andamento neste aluguel (ausente quando não há), para o app retomar a tela da troca. | [optional] 
**batterySwapFeeCents** | **int** | Taxa que uma troca de bateria na estação iniciada agora congelaria (`StationSwap.feeCents`), para o app mostrar \"Taxa R$ X\" na confirmação antes do `POST /swap-stations/{id}/swaps`: 0 nos planos `day`, `weekly` e `monthly`; nos planos `minute` e `hour`, o valor da taxa de sistema `battery_swap_fee` (mesma regra da criação da troca). Presente sempre que há `rental`.  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


