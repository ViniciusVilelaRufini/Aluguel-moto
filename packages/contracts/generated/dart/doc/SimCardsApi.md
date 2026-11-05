# volti_api.api.SimCardsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createSimCard**](SimCardsApi.md#createsimcard) | **POST** /sim-cards | Cadastrar chip
[**listSimCards**](SimCardsApi.md#listsimcards) | **GET** /sim-cards | Chips cadastrados
[**listTrackerConsoleCommands**](SimCardsApi.md#listtrackerconsolecommands) | **GET** /vehicles/{id}/tracker-console | Histórico do console do rastreador
[**sendTrackerConsoleCommand**](SimCardsApi.md#sendtrackerconsolecommand) | **POST** /vehicles/{id}/tracker-console | Enviar comando de texto ao rastreador
[**updateSimCard**](SimCardsApi.md#updatesimcard) | **PATCH** /sim-cards/{id} | Atualizar chip


# **createSimCard**
> SimCard createSimCard(createSimCardRequest)

Cadastrar chip

Com `vehicleId`, vincula o chip ao rastreador da moto. `409` se o ICCID já existe, se a moto não tem rastreador ou se o rastreador já tem outro chip. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSimCardsApi();
final CreateSimCardRequest createSimCardRequest = ; // CreateSimCardRequest | 

try {
    final response = api.createSimCard(createSimCardRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SimCardsApi->createSimCard: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **createSimCardRequest** | [**CreateSimCardRequest**](CreateSimCardRequest.md)|  | 

### Return type

[**SimCard**](SimCard.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSimCards**
> SimCardList listSimCards(q, status, unlinked)

Chips cadastrados

Ordenados do mais recente ao mais antigo. `vehicleId`/`vehicleCode` = moto do rastreador ao qual o chip está vinculado.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSimCardsApi();
final String q = q_example; // String | Busca parcial em ICCID e número da linha.
final SimCardStatus status = ; // SimCardStatus | 
final bool unlinked = true; // bool | `true` = só chips sem rastreador.

try {
    final response = api.listSimCards(q, status, unlinked);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SimCardsApi->listSimCards: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **q** | **String**| Busca parcial em ICCID e número da linha. | [optional] 
 **status** | [**SimCardStatus**](.md)|  | [optional] 
 **unlinked** | **bool**| `true` = só chips sem rastreador. | [optional] 

### Return type

[**SimCardList**](SimCardList.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listTrackerConsoleCommands**
> TrackerConsoleList listTrackerConsoleCommands(id, limit)

Histórico do console do rastreador

Mais recentes primeiro. Expira em 90 dias (LGPD).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSimCardsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final int limit = 56; // int | 

try {
    final response = api.listTrackerConsoleCommands(id, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SimCardsApi->listTrackerConsoleCommands: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **limit** | **int**|  | [optional] [default to 20]

### Return type

[**TrackerConsoleList**](TrackerConsoleList.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sendTrackerConsoleCommand**
> TrackerConsoleCommand sendTrackerConsoleCommand(id, sendTrackerConsoleRequest)

Enviar comando de texto ao rastreador

Console do rastreador J16 (GT06), só `admin`. O texto tem de 1 a 100 caracteres, casa com `^[A-Za-z0-9,.\\-_:]{1,99}#$` e não pode ser `GMT`, `FACTORY`, `FORMAT`, `PWD` nem `PASSWORD`. Risco: `read` = sem vírgula e diferente de `RESET`; `connection` = `RESET`, ou `APN`/`SERVER` com vírgula; `change` = os demais com vírgula. `change` e `connection` exigem `confirm: true` (senão `400`). A resposta é `202` com o comando em `pending`; o resultado chega pelo histórico (`GET`). Um comando `pending` por moto (outro → `409`); pendente há mais de 90 s vira `failed`/`timeout`. Rastreador que não é `relay_only` ou moto sem rastreador → `409`. Os argumentos mantêm a caixa. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSimCardsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final SendTrackerConsoleRequest sendTrackerConsoleRequest = ; // SendTrackerConsoleRequest | 

try {
    final response = api.sendTrackerConsoleCommand(id, sendTrackerConsoleRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SimCardsApi->sendTrackerConsoleCommand: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **sendTrackerConsoleRequest** | [**SendTrackerConsoleRequest**](SendTrackerConsoleRequest.md)|  | 

### Return type

[**TrackerConsoleCommand**](TrackerConsoleCommand.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateSimCard**
> SimCard updateSimCard(id, updateSimCardRequest)

Atualizar chip

`vehicleId: null` desvincula do rastreador; um `vehicleId` vincula (ou move) ao rastreador da moto. `409` se o ICCID já existe, se a moto não tem rastreador, se o rastreador já tem outro chip ou se o chip já está vinculado a outro rastreador. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getSimCardsApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final UpdateSimCardRequest updateSimCardRequest = ; // UpdateSimCardRequest | 

try {
    final response = api.updateSimCard(id, updateSimCardRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling SimCardsApi->updateSimCard: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **updateSimCardRequest** | [**UpdateSimCardRequest**](UpdateSimCardRequest.md)|  | 

### Return type

[**SimCard**](SimCard.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

