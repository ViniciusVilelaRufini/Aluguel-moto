# volti_api.api.KycApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createKycUploads**](KycApi.md#createkycuploads) | **POST** /kyc/uploads | URLs pré-assinadas para documento e selfie
[**getKycStatus**](KycApi.md#getkycstatus) | **GET** /kyc/status | Status da verificação
[**reviewCustomerKyc**](KycApi.md#reviewcustomerkyc) | **POST** /customers/{id}/kyc-review | Revisão manual da verificação
[**submitKyc**](KycApi.md#submitkyc) | **POST** /kyc/submit | Enviar verificação de identidade


# **createKycUploads**
> KycUploads createKycUploads(kycUploadRequest)

URLs pré-assinadas para documento e selfie

Devolve URLs `PUT` pré-assinadas (S3/MinIO) para a foto do documento (frente e, se houver, verso) e para a selfie com prova de vida. Válidas por 15 minutos.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getKycApi();
final KycUploadRequest kycUploadRequest = ; // KycUploadRequest | 

try {
    final response = api.createKycUploads(kycUploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling KycApi->createKycUploads: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kycUploadRequest** | [**KycUploadRequest**](KycUploadRequest.md)|  | 

### Return type

[**KycUploads**](KycUploads.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getKycStatus**
> KycStatusResponse getKycStatus()

Status da verificação

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getKycApi();

try {
    final response = api.getKycStatus();
    print(response);
} on DioException catch (e) {
    print('Exception when calling KycApi->getKycStatus: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**KycStatusResponse**](KycStatusResponse.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **reviewCustomerKyc**
> KycStatusResponse reviewCustomerKyc(id, kycReviewRequest)

Revisão manual da verificação

Decisão manual do time interno (por exemplo, documento ilegível no provedor). Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getKycApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final KycReviewRequest kycReviewRequest = ; // KycReviewRequest | 

try {
    final response = api.reviewCustomerKyc(id, kycReviewRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling KycApi->reviewCustomerKyc: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **kycReviewRequest** | [**KycReviewRequest**](KycReviewRequest.md)|  | 

### Return type

[**KycStatusResponse**](KycStatusResponse.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **submitKyc**
> KycStatusResponse submitKyc(kycSubmitRequest)

Enviar verificação de identidade

Envia os dados e as chaves dos arquivos já enviados. O provedor de KYC (mock em dev: aprova se 18+, reprova CPF terminado em `00`) responde de forma assíncrona; o status fica `pending` até a decisão. Menor de 18 anos → `422` (`kyc-underage`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getKycApi();
final KycSubmitRequest kycSubmitRequest = ; // KycSubmitRequest | 

try {
    final response = api.submitKyc(kycSubmitRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling KycApi->submitKyc: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kycSubmitRequest** | [**KycSubmitRequest**](KycSubmitRequest.md)|  | 

### Return type

[**KycStatusResponse**](KycStatusResponse.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

