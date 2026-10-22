# volti_api.api.StationsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**listSwapStations**](StationsApi.md#listswapstations) | **GET** /swap-stations | Estações de troca de bateria (mapa)


# **listSwapStations**
> SwapStationList listSwapStations(lat, lng, radiusM)

Estações de troca de bateria (mapa)

Estações ativas com posição, endereço, horário e baterias carregadas disponíveis. Com `lat`/`lng`, filtra pelo raio e ordena por distância (`distanceM`); sem eles, todas em ordem alfabética.  Leitura aberta a qualquer cliente autenticado (`customerAuth`, sem grupo: o mapa e a folha \"Troca de bateria\" do app). `x-required-groups` vale só para `staffAuth`. A resposta traz apenas os campos públicos de `SwapStation` (identificador, nome, endereço, posição, baterias, vagas, horário e distância); dados internos da estação (ativa/inativa, datas de cadastro) não saem da API, para nenhum pool. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getStationsApi();
final double lat = 1.2; // double | 
final double lng = 1.2; // double | 
final int radiusM = 56; // int | Raio em metros (só com `lat`/`lng`).

try {
    final response = api.listSwapStations(lat, lng, radiusM);
    print(response);
} on DioException catch (e) {
    print('Exception when calling StationsApi->listSwapStations: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **lat** | **double**|  | [optional] 
 **lng** | **double**|  | [optional] 
 **radiusM** | **int**| Raio em metros (só com `lat`/`lng`). | [optional] [default to 10000]

### Return type

[**SwapStationList**](SwapStationList.md)

### Authorization

[staffAuth](../README.md#staffAuth), [customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

