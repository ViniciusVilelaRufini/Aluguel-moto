# volti_api.model.GeoZoneInput

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** |  | 
**type** | [**ZoneType**](ZoneType.md) |  | 
**speedLimitKmh** | **int** | Obrigatório em `reduced_speed` (ausente → 422 `zone-speed-limit-required`; 21 a 32 → 422 `zone-speed-limit-invalid`); ignorado nos demais tipos. Acima de 32 → 400. | [optional] 
**geometry** | [**GeoJsonPolygon**](GeoJsonPolygon.md) |  | 
**active** | **bool** |  | [optional] [default to true]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


