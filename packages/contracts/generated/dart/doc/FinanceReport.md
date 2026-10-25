# volti_api.model.FinanceReport

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**from** | [**DateTime**](DateTime.md) |  | 
**to** | [**DateTime**](DateTime.md) |  | 
**revenueByPlan** | [**BuiltList&lt;PlanRevenue&gt;**](PlanRevenue.md) | Receita de aluguéis encerrados no período, por plano (custo total do aluguel). | 
**rentalRevenueCents** | **int** | Soma de `revenueByPlan`. | [optional] 
**subscriptionRevenueCents** | **int** | Cobranças de assinatura (semanal/mensal, inclusive renovações) pagas, criadas no período. | [optional] 
**totalRevenueCents** | **int** | Receita = aluguéis encerrados (`rentalRevenueCents`) + assinaturas pagas (`subscriptionRevenueCents`). Não entram: caução (garantia), recargas e pacotes de minutos da carteira (`walletTopUpsCents`, crédito pré-pago que vira receita quando é usado num aluguel) e estornos (`refundsCents`, informados à parte).  | 
**depositsHeldCount** | **int** | Cauções retidas agora. | 
**depositsHeldCents** | **int** |  | 
**delinquentCustomers** | **int** |  | 
**delinquentAmountCents** | **int** |  | 
**refundsCents** | **int** |  | 
**walletTopUpsCents** | **int** |  | [optional] 
**insurancePremiumsCents** | **int** |  | 
**insurancePayoutsCents** | **int** | Repasses à seguradora. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


