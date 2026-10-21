# volti_api.model.Me

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** | ID interno (Customer.id ou StaffUser.id). | 
**sub** | **String** | `sub` do token. | [optional] 
**pool** | [**AuthPool**](AuthPool.md) |  | 
**email** | **String** |  | 
**groups** | [**BuiltList&lt;StaffGroup&gt;**](StaffGroup.md) | Grupos de staff (vazio para clientes). | 
**customer** | [**Customer**](Customer.md) |  | [optional] 
**staff** | [**StaffUser**](StaffUser.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


