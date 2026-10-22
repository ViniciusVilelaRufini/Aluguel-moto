# volti_api.model.Reservation

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**vehicleId** | **String** |  | 
**vehicle** | [**VehicleSummary**](VehicleSummary.md) |  | [optional] 
**status** | [**ReservationStatus**](ReservationStatus.md) |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**expiresAt** | [**DateTime**](DateTime.md) | Base da contagem regressiva no app. Galpão: `now` → criação + `pickupNowWindowMinutes`; `scheduled` → `pickupAt` + `scheduledGraceMinutes`.  | 
**depotId** | **String** | Só em reserva de galpão. | [optional] 
**pickupMode** | [**PickupMode**](PickupMode.md) |  | [optional] 
**pickupAt** | [**DateTime**](DateTime.md) |  | [optional] 
**planCode** | [**PlanCode**](PlanCode.md) |  | [optional] 
**coverage** | [**InsuranceCoverage**](InsuranceCoverage.md) |  | [optional] 
**depositMethod** | [**DepositMethod**](DepositMethod.md) |  | [optional] 
**deposit** | [**Deposit**](Deposit.md) |  | [optional] 
**pickupCode** | **String** | Conteúdo do QR de retirada (assinado, curto, sem dado pessoal). Só na resposta ao cliente dono da reserva.  | [optional] 
**handoverId** | **String** | Entrega aberta ou concluída (status `handover`/`converted`). | [optional] 
**customerFirstName** | **String** | staff. Só o primeiro nome (agenda de retiradas). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


