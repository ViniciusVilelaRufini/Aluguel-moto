# volti_api.model.Customer

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**name** | **String** |  | [optional] 
**email** | **String** |  | 
**phone** | **String** |  | [optional] 
**cpf** | **String** | Completo para o próprio cliente e para `admin`; mascarado (`***.456.789-**`) para os demais grupos. | [optional] 
**birthDate** | [**Date**](Date.md) |  | [optional] 
**kycStatus** | [**KycStatus**](KycStatus.md) |  | 
**status** | [**CustomerStatus**](CustomerStatus.md) |  | 
**delinquent** | **bool** | Inadimplente (sem novos aluguéis). | 
**restricted** | **bool** | CPF na lista de restrição. | 
**blockedReason** | **String** | staff. | [optional] 
**blockedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**locationConsent** | **bool** |  | [optional] 
**emergencyContactName** | **String** |  | [optional] 
**emergencyContactPhone** | **String** |  | [optional] 
**stats** | [**CustomerStats**](CustomerStats.md) |  | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


