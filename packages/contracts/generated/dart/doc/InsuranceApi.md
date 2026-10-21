# volti_api.api.InsuranceApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getInsurancePolicy**](InsuranceApi.md#getinsurancepolicy) | **GET** /insurance/policies/{id} | Detalhe da apólice
[**listInsuranceCoverages**](InsuranceApi.md#listinsurancecoverages) | **GET** /insurance/coverages | Coberturas de seguro
[**listInsurancePolicies**](InsuranceApi.md#listinsurancepolicies) | **GET** /insurance/policies | Apólices emitidas
[**updateInsuranceCoverage**](InsuranceApi.md#updateinsurancecoverage) | **PUT** /insurance/coverages/{coverage} | Configurar cobertura


# **getInsurancePolicy**
> InsurancePolicy getInsurancePolicy(id)

Detalhe da apólice

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getInsuranceApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getInsurancePolicy(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling InsuranceApi->getInsurancePolicy: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**InsurancePolicy**](InsurancePolicy.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listInsuranceCoverages**
> InsuranceCoverageOptionList listInsuranceCoverages()

Coberturas de seguro

`basic` é obrigatória (vem pré-selecionada e não pode ser removida no app); `full` é opcional.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getInsuranceApi();

try {
    final response = api.listInsuranceCoverages();
    print(response);
} on DioException catch (e) {
    print('Exception when calling InsuranceApi->listInsuranceCoverages: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**InsuranceCoverageOptionList**](InsuranceCoverageOptionList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listInsurancePolicies**
> InsurancePolicyPage listInsurancePolicies(cursor, limit, customerId, rentalId, from, to)

Apólices emitidas

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getInsuranceApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.
final String customerId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final String rentalId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.listInsurancePolicies(cursor, limit, customerId, rentalId, from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling InsuranceApi->listInsurancePolicies: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]
 **customerId** | **String**|  | [optional] 
 **rentalId** | **String**|  | [optional] 
 **from** | **DateTime**| Início do período (inclusive), UTC. | [optional] 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | [optional] 

### Return type

[**InsurancePolicyPage**](InsurancePolicyPage.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateInsuranceCoverage**
> InsuranceCoverageOption updateInsuranceCoverage(coverage, insuranceCoverageUpdate)

Configurar cobertura

Grava AuditLog. A venda do seguro é feita pela seguradora parceira (SUSEP); o sistema só intermedia.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getInsuranceApi();
final InsuranceCoverage coverage = ; // InsuranceCoverage | 
final InsuranceCoverageUpdate insuranceCoverageUpdate = ; // InsuranceCoverageUpdate | 

try {
    final response = api.updateInsuranceCoverage(coverage, insuranceCoverageUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling InsuranceApi->updateInsuranceCoverage: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **coverage** | [**InsuranceCoverage**](.md)|  | 
 **insuranceCoverageUpdate** | [**InsuranceCoverageUpdate**](InsuranceCoverageUpdate.md)|  | 

### Return type

[**InsuranceCoverageOption**](InsuranceCoverageOption.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

