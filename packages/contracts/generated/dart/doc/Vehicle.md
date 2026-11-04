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
**batteryPct** | **int** | Carga da bateria (%). Com `batteryKnown: false` vem 0 e não é leitura real (não exibir como nível). | 
**estimatedRangeKm** | **double** | Autonomia estimada pela carga. Com `batteryKnown: false` vem 0 e não é real. | 
**batteryKnown** | **bool** | O rastreador tem leitura da bateria (telemetria `bateria_conhecida`, mqtt.md). Ausente = `true` (API antiga). `false` = sem leitura (ex.: J16 numa fonte DC-DC): `batteryPct` e `estimatedRangeKm` vêm 0 e devem aparecer como \"Bateria desconhecida\", nunca como 0%.  | [optional] 
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
**firmwareVersion** | **String** | staff. Versão do firmware do rastreador vinculado (`Tracker.firmwareVersion`); sem ela, a gravada na moto. Ausente = desconhecida. | [optional] 
**lastSeenAt** | [**DateTime**](DateTime.md) | staff. Último sinal do rastreador (telemetria, status/heartbeat ou reported), na hora do servidor; atualizado no banco no máximo a cada 15 s. | [optional] 
**positionAt** | [**DateTime**](DateTime.md) | Hora da medição de `lat`/`lng` (e de `speedKmh`). Ausente = desconhecida. Diferente de `lastSeenAt`: o heartbeat do rastreador avança o último sinal sem posição nova (ex.: J16 sem GPS válido). Posição velha (mais de 30 s) não é a posição atual e a velocidade dela não é a atual. Para cliente, vem só junto com a posição visível (moto livre ou da própria reserva/aluguel; nunca com `locationHidden`): a devolução do app avisa que a moto está sem GPS e por isso não trava (a trava só relé espera a parada confirmada pelo GPS).  | [optional] 
**currentRentalId** | **String** | staff. | [optional] 
**vehicleModelId** | **String** |  | [optional] 
**categoryLabel** | **String** |  | [optional] 
**pricePerMinuteCents** | **int** |  | [optional] 
**address** | **String** | Endereço aproximado da posição atual (geocodificação reversa em cache). `null` quando a posição atual não tem endereço geocodificado (sem resultado, provedor lento ou fora do orçamento da leitura): nunca o endereço de outro lugar. Ausente com `locationHidden`.  | [optional] 
**addressUpdatedAt** | [**DateTime**](DateTime.md) | Quando `address` foi calculado; `null` junto com `address: null`. | [optional] 
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


