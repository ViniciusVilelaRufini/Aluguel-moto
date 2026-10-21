# volti_api.api.LgpdApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**deleteMyAccount**](LgpdApi.md#deletemyaccount) | **DELETE** /lgpd/account | Excluir minha conta
[**exportMyData**](LgpdApi.md#exportmydata) | **GET** /lgpd/export | Exportar meus dados
[**getConsents**](LgpdApi.md#getconsents) | **GET** /lgpd/consents | Consentimentos do cliente
[**updateConsents**](LgpdApi.md#updateconsents) | **PUT** /lgpd/consents | Registrar consentimentos (termos e localização)


# **deleteMyAccount**
> AccountDeletion deleteMyAccount()

Excluir minha conta

Anonimiza nome, CPF, e-mail e telefone, apaga trajetos e documentos de KYC e mantém pagamentos e notas fiscais (obrigação legal). Bloqueado com aluguel em andamento ou débito pendente (`409` `account-deletion-blocked`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getLgpdApi();

try {
    final response = api.deleteMyAccount();
    print(response);
} on DioException catch (e) {
    print('Exception when calling LgpdApi->deleteMyAccount: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**AccountDeletion**](AccountDeletion.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **exportMyData**
> LgpdExport exportMyData()

Exportar meus dados

Todos os dados pessoais do próprio cliente (e somente dele), incluindo trajetos ainda não expirados.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getLgpdApi();

try {
    final response = api.exportMyData();
    print(response);
} on DioException catch (e) {
    print('Exception when calling LgpdApi->exportMyData: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**LgpdExport**](LgpdExport.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getConsents**
> Consents getConsents()

Consentimentos do cliente

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getLgpdApi();

try {
    final response = api.getConsents();
    print(response);
} on DioException catch (e) {
    print('Exception when calling LgpdApi->getConsents: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**Consents**](Consents.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateConsents**
> Consents updateConsents(consentsUpdate)

Registrar consentimentos (termos e localização)

O onboarding exige `termsAccepted` e `locationTracking` verdadeiros para seguir. Sem consentimento de localização, `POST /rentals` é recusado (`403` `location-consent-required`); reservar não exige o consentimento.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getLgpdApi();
final ConsentsUpdate consentsUpdate = ; // ConsentsUpdate | 

try {
    final response = api.updateConsents(consentsUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling LgpdApi->updateConsents: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **consentsUpdate** | [**ConsentsUpdate**](ConsentsUpdate.md)|  | 

### Return type

[**Consents**](Consents.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

