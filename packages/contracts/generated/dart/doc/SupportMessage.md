# volti_api.model.SupportMessage

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**conversationId** | **String** |  | 
**authorType** | [**MessageAuthorType**](MessageAuthorType.md) |  | 
**authorId** | **String** |  | [optional] 
**authorName** | **String** | Primeiro nome do atendente (staff) ou \"Você\". | [optional] 
**body** | **String** |  | 
**attachmentObjectKeys** | **BuiltList&lt;String&gt;** |  | [optional] 
**status** | [**SupportMessageStatus**](SupportMessageStatus.md) |  | [optional] 
**deliveredAt** | [**DateTime**](DateTime.md) | O outro lado buscou a mensagem. | [optional] 
**readAt** | [**DateTime**](DateTime.md) | O outro lado marcou como lida. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


