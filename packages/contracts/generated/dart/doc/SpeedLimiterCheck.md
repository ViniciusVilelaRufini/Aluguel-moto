# volti_api.model.SpeedLimiterCheck

## Load the model package
```dart
import 'package:volti_api/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ok** | **bool** |  | 
**configuredMaxKmh** | **int** | Observação: velocidade máxima lida no controlador durante a inspeção (0 a 100). Não configura nada (limites configuráveis continuam 0..32). Acima de 32 a moto está fora da lei: `ok: true` → `422` `speed-limiter-noncompliant`; a API abre manutenção corretiva e alerta e põe a moto em `maintenance`.  | 
**notes** | **String** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


