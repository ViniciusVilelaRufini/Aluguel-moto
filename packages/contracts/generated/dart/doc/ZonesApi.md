# volti_api.api.ZonesApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createZone**](ZonesApi.md#createzone) | **POST** /zones | Criar cerca
[**deleteZone**](ZonesApi.md#deletezone) | **DELETE** /zones/{id} | Excluir cerca
[**getZone**](ZonesApi.md#getzone) | **GET** /zones/{id} | Detalhe da cerca
[**listZones**](ZonesApi.md#listzones) | **GET** /zones | Listar cercas
[**updateZone**](ZonesApi.md#updatezone) | **PUT** /zones/{id} | Substituir cerca


# **createZone**
> GeoZone createZone(geoZoneInput)

Criar cerca

Polígono GeoJSON válido (anel fechado, sem autointerseção) → senão `422` (`zone-invalid-geometry`). `reduced_speed` exige `speedLimitKmh`: ausente → `422` `zone-speed-limit-required`; entre 21 e 32 → `422` `zone-speed-limit-invalid` (máximo 20 em zonas de velocidade reduzida); acima de 32 → sempre `400` (validação do schema). Sincronizada com o motor de cercas. Grava AuditLog. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getZonesApi();
final GeoZoneInput geoZoneInput = ; // GeoZoneInput | 

try {
    final response = api.createZone(geoZoneInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ZonesApi->createZone: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **geoZoneInput** | [**GeoZoneInput**](GeoZoneInput.md)|  | 

### Return type

[**GeoZone**](GeoZone.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteZone**
> deleteZone(id)

Excluir cerca

Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getZonesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    api.deleteZone(id);
} on DioException catch (e) {
    print('Exception when calling ZonesApi->deleteZone: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

void (empty response body)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getZone**
> GeoZone getZone(id)

Detalhe da cerca

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getZonesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 

try {
    final response = api.getZone(id);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ZonesApi->getZone: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**GeoZone**](GeoZone.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listZones**
> GeoZoneList listZones(bbox, type, includeInactive)

Listar cercas

Sem paginação (o número de zonas é pequeno). Filtra por `bbox` quando informado.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getZonesApi();
final String bbox = -46.72,-23.58,-46.64,-23.54; // String | Caixa `minLng,minLat,maxLng,maxLat` (WGS84).
final ZoneType type = ; // ZoneType | 
final bool includeInactive = true; // bool | Só staff.

try {
    final response = api.listZones(bbox, type, includeInactive);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ZonesApi->listZones: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **bbox** | **String**| Caixa `minLng,minLat,maxLng,maxLat` (WGS84). | [optional] 
 **type** | [**ZoneType**](.md)|  | [optional] 
 **includeInactive** | **bool**| Só staff. | [optional] [default to false]

### Return type

[**GeoZoneList**](GeoZoneList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateZone**
> GeoZone updateZone(id, geoZoneInput)

Substituir cerca

Mesmas validações de `createZone`. Grava AuditLog.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getZonesApi();
final String id = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final GeoZoneInput geoZoneInput = ; // GeoZoneInput | 

try {
    final response = api.updateZone(id, geoZoneInput);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ZonesApi->updateZone: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **geoZoneInput** | [**GeoZoneInput**](GeoZoneInput.md)|  | 

### Return type

[**GeoZone**](GeoZone.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

