# volti_api.model.LgpdSupportConversation

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**customerId** | **String** |  | 
**customerName** | **String** | staff. | [optional] 
**rentalId** | **String** |  | [optional] 
**subject** | **String** |  | 
**status** | [**ConversationStatus**](ConversationStatus.md) |  | 
**unreadCount** | **int** | Mensagens não lidas por quem consulta. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**lastMessageAt** | [**DateTime**](DateTime.md) |  | 
**messages** | [**BuiltList&lt;SupportMessage&gt;**](SupportMessage.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


