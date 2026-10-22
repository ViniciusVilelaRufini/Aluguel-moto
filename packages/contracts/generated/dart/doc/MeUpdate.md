# volti_api.model.MeUpdate

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | [optional] 
**phone** | **String** | E.164, ex. `+5511987654321`. | [optional] 
**emergencyContactName** | **String** |  | [optional] 
**emergencyContactPhone** | **String** |  | [optional] 
**pixRefundKeyType** | [**PixKeyType**](PixKeyType.md) |  | [optional] 
**pixRefundKey** | **String** | Chave Pix para estornos. Envie junto com `pixRefundKeyType`; validada pelo tipo (`422` `pix-key-invalid`): CPF com dígitos verificadores e igual ao CPF da conta, e-mail, celular E.164 `+55` ou chave aleatória (UUID). É normalizada (CPF só dígitos, e-mail minúsculo). String vazia remove a chave. Grava AuditLog.  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


