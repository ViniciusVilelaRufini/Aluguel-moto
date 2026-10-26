# volti_api.model.GeoZone

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**name** | **String** |  | 
**type** | [**ZoneType**](ZoneType.md) |  | 
**speedLimitKmh** | **int** | Só em `reduced_speed` (6 pedestres, 20 ciclovia; sempre entre 6 e 20). | [optional] 
**geometry** | [**GeoJsonPolygon**](GeoJsonPolygon.md) |  | 
**active** | **bool** |  | 
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


