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
**authorName** | **String** | Mensagem da equipe: primeiro nome cadastrado do atendente ou, sem nome cadastrado, \"Equipe Volti\" (nunca derivado do e-mail).  | [optional] 
**body** | **String** |  | 
**attachmentObjectKeys** | **BuiltList&lt;String&gt;** |  | [optional] 
**attachmentUrls** | **BuiltList&lt;String&gt;** | Só nas respostas para a equipe: URLs pré-assinadas (GET, 15 minutos) dos anexos, na mesma ordem de `attachmentObjectKeys`. Só anexos enviados pelo próprio autor (`support/<authorId>/…`) ganham URL.  | [optional] 
**status** | [**SupportMessageStatus**](SupportMessageStatus.md) |  | [optional] 
**deliveredAt** | [**DateTime**](DateTime.md) | O outro lado buscou a mensagem. | [optional] 
**readAt** | [**DateTime**](DateTime.md) | O outro lado marcou como lida. | [optional] 
**createdAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


