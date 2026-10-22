# volti_api.model.LgpdExport

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**generatedAt** | [**DateTime**](DateTime.md) |  | 
**customer** | [**Customer**](Customer.md) |  | 
**consents** | [**Consents**](Consents.md) |  | 
**rentals** | [**BuiltList&lt;Rental&gt;**](Rental.md) |  | 
**payments** | [**BuiltList&lt;Payment&gt;**](Payment.md) |  | 
**tracks** | [**BuiltList&lt;Track&gt;**](Track.md) |  | 
**walletEntries** | [**BuiltList&lt;WalletEntry&gt;**](WalletEntry.md) |  | 
**incidents** | [**BuiltList&lt;Incident&gt;**](Incident.md) |  | 
**disputes** | [**BuiltList&lt;Dispute&gt;**](Dispute.md) |  | 
**claims** | [**BuiltList&lt;Claim&gt;**](Claim.md) |  | 
**subscriptions** | [**BuiltList&lt;Subscription&gt;**](Subscription.md) |  | [optional] 
**coupons** | [**BuiltList&lt;CustomerCoupon&gt;**](CustomerCoupon.md) |  | [optional] 
**referrals** | [**BuiltList&lt;ReferralReward&gt;**](ReferralReward.md) | Indicações feitas pelo titular (só o primeiro nome do amigo). | [optional] 
**referralCode** | **String** |  | [optional] 
**maintenanceRequests** | [**BuiltList&lt;CustomerMaintenanceRequest&gt;**](CustomerMaintenanceRequest.md) |  | [optional] 
**depotReservations** | [**BuiltList&lt;Reservation&gt;**](Reservation.md) | Reservas de retirada no galpão (sem `pickupCode`). | [optional] 
**handovers** | [**BuiltList&lt;Handover&gt;**](Handover.md) | Entregas do titular (fotos só como chaves, sem links). | [optional] 
**stationSwaps** | [**BuiltList&lt;StationSwap&gt;**](StationSwap.md) | Trocas de bateria na estação feitas pelo titular (sem posição). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


