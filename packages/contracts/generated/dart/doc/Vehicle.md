# volti_api.model.Vehicle

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**code** | **String** |  | 
**qrCode** | **String** | Conteúdo do QR impresso. | [optional] 
**model** | **String** |  | 
**status** | [**VehicleStatus**](VehicleStatus.md) |  | 
**lat** | **double** |  | 
**lng** | **double** |  | 
**batteryPct** | **int** |  | 
**estimatedRangeKm** | **double** |  | 
**speedLimitKmh** | **int** | Limite atual aplicado (zona ou comando). | 
**thingName** | **String** | staff. | [optional] 
**trackerId** | **String** | staff. | [optional] 
**trackerControlMode** | [**TrackerControlMode**](TrackerControlMode.md) | staff. Tipo do rastreador (somente leitura; muda só pelo provisionamento). Sem rastreador cadastrado, `speed_control`. | [optional] 
**batterySerial** | **String** | staff. Bateria instalada. | [optional] 
**online** | **bool** | staff. | [optional] 
**locked** | **bool** | staff. | [optional] 
**ignition** | **bool** | staff. | [optional] 
**speedKmh** | **double** | staff. Velocidade reportada. | [optional] 
**signal** | **int** | staff. | [optional] 
**stolenMode** | **bool** | staff. | [optional] 
**firmwareVersion** | **String** | staff. | [optional] 
**lastSeenAt** | [**DateTime**](DateTime.md) | staff. Último sinal. | [optional] 
**currentRentalId** | **String** | staff. | [optional] 
**vehicleModelId** | **String** |  | [optional] 
**categoryLabel** | **String** |  | [optional] 
**pricePerMinuteCents** | **int** |  | [optional] 
**address** | **String** | Endereço aproximado da posição atual (geocodificação reversa em cache). | [optional] 
**addressUpdatedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**odometerKm** | **double** | staff. | [optional] 
**usageHours** | **double** | staff. Horas com ignição ligada. | [optional] 
**service** | [**VehicleServiceInfo**](VehicleServiceInfo.md) |  | [optional] 
**battery** | [**Battery**](Battery.md) |  | [optional] 
**assignedSubscriptionId** | **String** | staff. Moto fixa de uma assinatura semanal/mensal. | [optional] 
**depotId** | **String** | Galpão de origem/atual. Disponível para retirada = `status: free` com `depotId`. | [optional] 
**locationHidden** | **bool** | Cliente consultando moto em uso por outra pessoa (alugada, pausada ou reservada por outro cliente): a posição é ocultada (LGPD) — `lat`/`lng` vêm `0` e `address` ausente. Nunca vem para staff.  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | [optional] 
**updatedAt** | [**DateTime**](DateTime.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


