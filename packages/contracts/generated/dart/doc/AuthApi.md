# volti_api.api.AuthApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createDevToken**](AuthApi.md#createdevtoken) | **POST** /dev/token | Emitir token de desenvolvimento
[**getMe**](AuthApi.md#getme) | **GET** /me | Usuário autenticado
[**registerDevice**](AuthApi.md#registerdevice) | **POST** /me/devices | Registrar dispositivo para push (FCM)
[**updateMe**](AuthApi.md#updateme) | **PATCH** /me | Atualizar o próprio perfil (cliente)


# **createDevToken**
> DevTokenResponse createDevToken(devTokenRequest)

Emitir token de desenvolvimento

Existe **somente** com `AUTH_MODE=dev` (em produção a rota não é registrada e responde 404). Emite um JWT HS256 do emissor local `volti-dev` com as mesmas claims do Cognito (`sub`, `email`, `cognito:groups`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAuthApi();
final DevTokenRequest devTokenRequest = ; // DevTokenRequest | 

try {
    final response = api.createDevToken(devTokenRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AuthApi->createDevToken: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **devTokenRequest** | [**DevTokenRequest**](DevTokenRequest.md)|  | 

### Return type

[**DevTokenResponse**](DevTokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getMe**
> Me getMe()

Usuário autenticado

Devolve o perfil do dono do token (cliente ou staff). Cria o cadastro do cliente no primeiro acesso.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAuthApi();

try {
    final response = api.getMe();
    print(response);
} on DioException catch (e) {
    print('Exception when calling AuthApi->getMe: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**Me**](Me.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **registerDevice**
> registerDevice(deviceRegistration)

Registrar dispositivo para push (FCM)

Idempotente por `fcmToken`. Usado pelos apps do cliente e do operador.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAuthApi();
final DeviceRegistration deviceRegistration = ; // DeviceRegistration | 

try {
    api.registerDevice(deviceRegistration);
} on DioException catch (e) {
    print('Exception when calling AuthApi->registerDevice: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **deviceRegistration** | [**DeviceRegistration**](DeviceRegistration.md)|  | 

### Return type

void (empty response body)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateMe**
> Me updateMe(meUpdate)

Atualizar o próprio perfil (cliente)

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getAuthApi();
final MeUpdate meUpdate = ; // MeUpdate | 

try {
    final response = api.updateMe(meUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling AuthApi->updateMe: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **meUpdate** | [**MeUpdate**](MeUpdate.md)|  | 

### Return type

[**Me**](Me.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

