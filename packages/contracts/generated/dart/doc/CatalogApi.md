# volti_api.api.CatalogApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createVehicleModel**](CatalogApi.md#createvehiclemodel) | **POST** /vehicle-models | Cadastrar modelo
[**createVehicleModelPhotoUpload**](CatalogApi.md#createvehiclemodelphotoupload) | **POST** /vehicle-models/uploads | URL de upload da foto do modelo
[**listVehicleModels**](CatalogApi.md#listvehiclemodels) | **GET** /vehicle-models | Catálogo de modelos (\&quot;Escolha sua moto\&quot;)
[**updateVehicleModel**](CatalogApi.md#updatevehiclemodel) | **PATCH** /vehicle-models/{id} | Editar modelo (preço, foto, intervalo de revisão)


# **createVehicleModel**
> VehicleModel createVehicleModel(vehicleModelInput)

Cadastrar modelo

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCatalogApi();
final VehicleModelInput vehicleModelInput = ; // VehicleModelInput | 

try {
    final response = api.createVehicleModel(vehicleModelInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CatalogApi->createVehicleModel: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **vehicleModelInput** | [**VehicleModelInput**](VehicleModelInput.md)|  | 

### Return type

[**VehicleModel**](VehicleModel.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createVehicleModelPhotoUpload**
> PresignedUpload createVehicleModelPhotoUpload(uploadRequest)

URL de upload da foto do modelo

Upload direto ao bucket de catálogo (`catalog/<uuid>.<ext>`); depois envie `photoObjectKey` em `PATCH /vehicle-models/{id}`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCatalogApi();
final UploadRequest uploadRequest = ; // UploadRequest | 

try {
    final response = api.createVehicleModelPhotoUpload(uploadRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CatalogApi->createVehicleModelPhotoUpload: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **uploadRequest** | [**UploadRequest**](UploadRequest.md)|  | 

### Return type

[**PresignedUpload**](PresignedUpload.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listVehicleModels**
> VehicleModelList listVehicleModels(includeInactive)

Catálogo de modelos (\"Escolha sua moto\")

Modelos ativos em `sortOrder` (staff com `includeInactive=true` vê todos). `pricePerMinuteCents` substitui o preço por minuto do plano `minute` para motos do modelo (o desbloqueio e a pausa continuam os do plano, salvo `unlockFeeCents`). `photoUrl` é um link assinado (S3/MinIO) válido por 24 h. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCatalogApi();
final bool includeInactive = true; // bool | Só staff.

try {
    final response = api.listVehicleModels(includeInactive);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CatalogApi->listVehicleModels: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **includeInactive** | **bool**| Só staff. | [optional] [default to false]

### Return type

[**VehicleModelList**](VehicleModelList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateVehicleModel**
> VehicleModel updateVehicleModel(id, vehicleModelUpdate)

Editar modelo (preço, foto, intervalo de revisão)

Grava AuditLog (`vehicle_model.update`). Mudança de preço vale para aluguéis iniciados depois (o aluguel guarda o preço do início).

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getCatalogApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final VehicleModelUpdate vehicleModelUpdate = ; // VehicleModelUpdate | 

try {
    final response = api.updateVehicleModel(id, vehicleModelUpdate);
    print(response);
} on DioException catch (e) {
    print('Exception when calling CatalogApi->updateVehicleModel: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **vehicleModelUpdate** | [**VehicleModelUpdate**](VehicleModelUpdate.md)|  | 

### Return type

[**VehicleModel**](VehicleModel.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

