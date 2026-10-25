# volti_api.api.PublicApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getSharedLocation**](PublicApi.md#getsharedlocation) | **GET** /public/location-shares/{token} | Localização compartilhada (link público do SOS)
[**getSharedLocationPage**](PublicApi.md#getsharedlocationpage) | **GET** /share/{token} | Página da localização compartilhada


# **getSharedLocation**
> SharedLocation getSharedLocation(token)

Localização compartilhada (link público do SOS)

Sem autenticação: quem tem o link vê **só** a última posição da moto e o horário dela, enquanto o compartilhamento estiver dentro da validade e o aluguel continuar aberto. Nenhum dado pessoal (nome, telefone, moto, trajeto). Token desconhecido, expirado ou aluguel encerrado → 404 (mesma resposta, sem revelar qual). Rate limit por IP. `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPublicApi();
final String token = token_example; // String | Token do link de localização compartilhada (base64url, 32 caracteres).

try {
    final response = api.getSharedLocation(token);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PublicApi->getSharedLocation: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **token** | **String**| Token do link de localização compartilhada (base64url, 32 caracteres). | 

### Return type

[**SharedLocation**](SharedLocation.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSharedLocationPage**
> String getSharedLocationPage(token)

Página da localização compartilhada

Página HTML mínima (pt-BR) aberta pelo link de `POST /rentals/{id}/location-share` (`PUBLIC_SHARE_BASE_URL/{token}`): mostra a última posição e o horário (fuso America/Sao_Paulo), com link para abrir no mapa, e se atualiza sozinha a cada 15 s lendo `GET /public/location-shares/{token}`. Sem autenticação, sem cookies e sem scripts de terceiros. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getPublicApi();
final String token = token_example; // String | Token do link de localização compartilhada (base64url, 32 caracteres).

try {
    final response = api.getSharedLocationPage(token);
    print(response);
} on DioException catch (e) {
    print('Exception when calling PublicApi->getSharedLocationPage: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **token** | **String**| Token do link de localização compartilhada (base64url, 32 caracteres). | 

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

