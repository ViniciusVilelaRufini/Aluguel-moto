# volti_api.api.ReferralsApi

## Load the API package
```dart
import 'package:volti_api/api.dart';
```

All URIs are relative to *http://localhost:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getMyReferral**](ReferralsApi.md#getmyreferral) | **GET** /me/referral | Programa de indicação do cliente
[**listMyReferralRewards**](ReferralsApi.md#listmyreferralrewards) | **GET** /me/referral/rewards | Recompensas de indicação
[**redeemReferralCode**](ReferralsApi.md#redeemreferralcode) | **POST** /me/referral/redeem | Usar código de indicação de um amigo


# **getMyReferral**
> ReferralSummary getMyReferral()

Programa de indicação do cliente

Código de indicação do cliente (gerado no primeiro acesso, único), link de convite, valores das recompensas e totais. Regras: quem usa o código ganha `refereeRewardCents` na carteira na hora; quem indicou ganha `referrerRewardCents` quando o indicado termina a primeira corrida. 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReferralsApi();

try {
    final response = api.getMyReferral();
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReferralsApi->getMyReferral: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**ReferralSummary**](ReferralSummary.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listMyReferralRewards**
> ReferralRewardPage listMyReferralRewards(cursor, limit)

Recompensas de indicação

Uma linha por amigo indicado (mais recentes primeiro). `granted` tem o lançamento `bonus` correspondente no extrato da carteira.

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReferralsApi();
final String cursor = cursor_example; // String | Cursor opaco devolvido em `nextCursor` da página anterior.
final int limit = 56; // int | Itens por página.

try {
    final response = api.listMyReferralRewards(cursor, limit);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReferralsApi->listMyReferralRewards: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor opaco devolvido em `nextCursor` da página anterior. | [optional] 
 **limit** | **int**| Itens por página. | [optional] [default to 20]

### Return type

[**ReferralRewardPage**](ReferralRewardPage.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **redeemReferralCode**
> ReferralRedemption redeemReferralCode(referralRedeemRequest)

Usar código de indicação de um amigo

Só antes da primeira corrida e uma vez por conta. Código inexistente → `422` `referral-code-invalid`; próprio código, já indicado, conta com corrida ou conta sem KYC aprovado → `422` `referral-not-eligible`. Credita `rewardCents` na carteira (lançamento `bonus`). 

### Example
```dart
import 'package:volti_api/api.dart';

final api = VoltiApi().getReferralsApi();
final ReferralRedeemRequest referralRedeemRequest = ; // ReferralRedeemRequest | 

try {
    final response = api.redeemReferralCode(referralRedeemRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling ReferralsApi->redeemReferralCode: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **referralRedeemRequest** | [**ReferralRedeemRequest**](ReferralRedeemRequest.md)|  | 

### Return type

[**ReferralRedemption**](ReferralRedemption.md)

### Authorization

[customerAuth](../README.md#customerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json, application/problem+json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

