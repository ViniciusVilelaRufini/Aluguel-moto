# volti_api.api.ReportsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getDashboardSummary**](ReportsApi.md#getdashboardsummary) | **GET** /reports/dashboard | Resumo do dashboard
[**getDemandHeatmap**](ReportsApi.md#getdemandheatmap) | **GET** /reports/demand-heatmap | Mapa de calor de demanda
[**getFinanceReport**](ReportsApi.md#getfinancereport) | **GET** /reports/finance | Financeiro (cauções, inadimplência, repasses de seguro)
[**getOccupancyReport**](ReportsApi.md#getoccupancyreport) | **GET** /reports/occupancy | Ocupação da frota
[**getRevenuePerVehicleReport**](ReportsApi.md#getrevenuepervehiclereport) | **GET** /reports/revenue-per-vehicle | Receita por moto por dia
[**getRevenueReport**](ReportsApi.md#getrevenuereport) | **GET** /reports/revenue | Receita por período e plano


# **getDashboardSummary**
> DashboardSummary getDashboardSummary()

Resumo do dashboard

Ocupação, receita do dia (fuso America/Sao_Paulo), motos por status, aluguéis ativos e alertas abertos. `revenueTodayCents` volta zerado para quem não é `admin`/`financeiro`.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();

try {
    final response = api.getDashboardSummary();
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getDashboardSummary: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**DashboardSummary**](DashboardSummary.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDemandHeatmap**
> DemandHeatmap getDemandHeatmap(from, to)

Mapa de calor de demanda

Pontos de início de aluguel agregados em grade (~100 m), sem identificar clientes.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.

try {
    final response = api.getDemandHeatmap(from, to);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getDemandHeatmap: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 

### Return type

[**DemandHeatmap**](DemandHeatmap.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getFinanceReport**
> FinanceReport getFinanceReport(from, to, format)

Financeiro (cauções, inadimplência, repasses de seguro)

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.
final ReportFormat format = ; // ReportFormat | `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos).

try {
    final response = api.getFinanceReport(from, to, format);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getFinanceReport: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 
 **format** | [**ReportFormat**](.md)| `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos). | [optional] 

### Return type

[**FinanceReport**](FinanceReport.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/csv, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOccupancyReport**
> OccupancyReport getOccupancyReport(from, to, groupBy, format)

Ocupação da frota

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.
final ReportGroupBy groupBy = ; // ReportGroupBy | 
final ReportFormat format = ; // ReportFormat | `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos).

try {
    final response = api.getOccupancyReport(from, to, groupBy, format);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getOccupancyReport: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 
 **groupBy** | [**ReportGroupBy**](.md)|  | [optional] 
 **format** | [**ReportFormat**](.md)| `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos). | [optional] 

### Return type

[**OccupancyReport**](OccupancyReport.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/csv, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRevenuePerVehicleReport**
> VehicleRevenueReport getRevenuePerVehicleReport(from, to, vehicleId, format)

Receita por moto por dia

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.
final String vehicleId = 38400000-8cf0-11bd-b23e-10b96e4ef00d; // String | 
final ReportFormat format = ; // ReportFormat | `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos).

try {
    final response = api.getRevenuePerVehicleReport(from, to, vehicleId, format);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getRevenuePerVehicleReport: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 
 **vehicleId** | **String**|  | [optional] 
 **format** | [**ReportFormat**](.md)| `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos). | [optional] 

### Return type

[**VehicleRevenueReport**](VehicleRevenueReport.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/csv, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRevenueReport**
> RevenueReport getRevenueReport(from, to, groupBy, planCode, format)

Receita por período e plano

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReportsApi();
final DateTime from = 2013-10-20T19:20:30+01:00; // DateTime | Início do período (inclusive), UTC.
final DateTime to = 2013-10-20T19:20:30+01:00; // DateTime | Fim do período (exclusivo), UTC.
final ReportGroupBy groupBy = ; // ReportGroupBy | 
final PlanCode planCode = ; // PlanCode | 
final ReportFormat format = ; // ReportFormat | `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos).

try {
    final response = api.getRevenueReport(from, to, groupBy, planCode, format);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReportsApi->getRevenueReport: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **DateTime**| Início do período (inclusive), UTC. | 
 **to** | **DateTime**| Fim do período (exclusivo), UTC. | 
 **groupBy** | [**ReportGroupBy**](.md)|  | [optional] 
 **planCode** | [**PlanCode**](.md)|  | [optional] 
 **format** | [**ReportFormat**](.md)| `csv` devolve `text/csv` (separador `;`, UTF-8 com BOM, valores em centavos). | [optional] 

### Return type

[**RevenueReport**](RevenueReport.md)

### Authorization

[staffAuth](../README.md#staffAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/csv, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

