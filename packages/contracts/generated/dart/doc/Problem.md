# volti_api.model.Problem

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **String** | `https://api.volti.com.br/problems/<slug>` (ver a lista de slugs na descrição da API). | 
**title** | **String** | Resumo legível (pt-BR). | 
**status** | **int** |  | 
**detail** | **String** | Explicação desta ocorrência (pt-BR, pode ir para a UI). | [optional] 
**instance** | **String** | Caminho da requisição. | [optional] 
**code** | **String** | Slug do `type`, para facilitar o `switch` nos clientes. | [optional] 
**traceId** | **String** | ID de correlação dos logs. | [optional] 
**errors** | [**BuiltList&lt;ValidationIssue&gt;**](ValidationIssue.md) | Erros de validação por campo (só em `validation-error`). | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


