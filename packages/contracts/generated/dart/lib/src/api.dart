//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'package:dio/dio.dart';
import 'package:built_value/serializer.dart';
import 'package:volti_api/src/serializers.dart';
import 'package:volti_api/src/auth/api_key_auth.dart';
import 'package:volti_api/src/auth/basic_auth.dart';
import 'package:volti_api/src/auth/bearer_auth.dart';
import 'package:volti_api/src/auth/oauth.dart';
import 'package:volti_api/src/api/alerts_api.dart';
import 'package:volti_api/src/api/audit_api.dart';
import 'package:volti_api/src/api/auth_api.dart';
import 'package:volti_api/src/api/batteries_api.dart';
import 'package:volti_api/src/api/catalog_api.dart';
import 'package:volti_api/src/api/commands_api.dart';
import 'package:volti_api/src/api/customers_api.dart';
import 'package:volti_api/src/api/field_tasks_api.dart';
import 'package:volti_api/src/api/health_api.dart';
import 'package:volti_api/src/api/insurance_api.dart';
import 'package:volti_api/src/api/kyc_api.dart';
import 'package:volti_api/src/api/lgpd_api.dart';
import 'package:volti_api/src/api/maintenance_api.dart';
import 'package:volti_api/src/api/payments_api.dart';
import 'package:volti_api/src/api/pricing_api.dart';
import 'package:volti_api/src/api/referrals_api.dart';
import 'package:volti_api/src/api/rentals_api.dart';
import 'package:volti_api/src/api/reports_api.dart';
import 'package:volti_api/src/api/reservations_api.dart';
import 'package:volti_api/src/api/staff_api.dart';
import 'package:volti_api/src/api/stations_api.dart';
import 'package:volti_api/src/api/support_api.dart';
import 'package:volti_api/src/api/vehicles_api.dart';
import 'package:volti_api/src/api/wallet_api.dart';
import 'package:volti_api/src/api/webhooks_api.dart';
import 'package:volti_api/src/api/zones_api.dart';

class VoltiApi {
  static const String basePath = r'http://localhost:3000';

  final Dio dio;
  final Serializers serializers;

  VoltiApi({
    Dio? dio,
    Serializers? serializers,
    String? basePathOverride,
    List<Interceptor>? interceptors,
  })  : this.serializers = serializers ?? standardSerializers,
        this.dio = dio ??
            Dio(BaseOptions(
              baseUrl: basePathOverride ?? basePath,
              connectTimeout: const Duration(milliseconds: 5000),
              receiveTimeout: const Duration(milliseconds: 3000),
            )) {
    if (interceptors == null) {
      this.dio.interceptors.addAll([
        OAuthInterceptor(),
        BasicAuthInterceptor(),
        BearerAuthInterceptor(),
        ApiKeyAuthInterceptor(),
      ]);
    } else {
      this.dio.interceptors.addAll(interceptors);
    }
  }

  void setOAuthToken(String name, String token) {
    if (this.dio.interceptors.any((i) => i is OAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is OAuthInterceptor)
              as OAuthInterceptor)
          .tokens[name] = token;
    }
  }

  /// Removes the OAuth token associated with the given [name].
  ///
  /// If no [OAuthInterceptor] is registered or no token exists for the given
  /// [name], this method has no effect.
  void removeOAuthToken(String name) {
    if (this.dio.interceptors.any((i) => i is OAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is OAuthInterceptor)
              as OAuthInterceptor)
          .tokens
          .remove(name);
    }
  }

  void setBearerAuth(String name, String token) {
    if (this.dio.interceptors.any((i) => i is BearerAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BearerAuthInterceptor)
              as BearerAuthInterceptor)
          .tokens[name] = token;
    }
  }

  /// Removes the bearer authentication token associated with the given [name].
  ///
  /// If no [BearerAuthInterceptor] is registered or no token exists for the
  /// given [name], this method has no effect.
  void removeBearerAuth(String name) {
    if (this.dio.interceptors.any((i) => i is BearerAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BearerAuthInterceptor)
              as BearerAuthInterceptor)
          .tokens
          .remove(name);
    }
  }

  void setBasicAuth(String name, String username, String password) {
    if (this.dio.interceptors.any((i) => i is BasicAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BasicAuthInterceptor)
              as BasicAuthInterceptor)
          .authInfo[name] = BasicAuthInfo(username, password);
    }
  }

  /// Removes the basic authentication credentials associated with the given [name].
  ///
  /// If no [BasicAuthInterceptor] is registered or no credentials exist for the
  /// given [name], this method has no effect.
  void removeBasicAuth(String name) {
    if (this.dio.interceptors.any((i) => i is BasicAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BasicAuthInterceptor)
              as BasicAuthInterceptor)
          .authInfo
          .remove(name);
    }
  }

  void setApiKey(String name, String apiKey) {
    if (this.dio.interceptors.any((i) => i is ApiKeyAuthInterceptor)) {
      (this
                  .dio
                  .interceptors
                  .firstWhere((element) => element is ApiKeyAuthInterceptor)
              as ApiKeyAuthInterceptor)
          .apiKeys[name] = apiKey;
    }
  }

  /// Removes the API key associated with the given [name].
  ///
  /// If no [ApiKeyAuthInterceptor] is registered or no API key exists for the
  /// given [name], this method has no effect.
  void removeApiKey(String name) {
    if (this.dio.interceptors.any((i) => i is ApiKeyAuthInterceptor)) {
      (this
                  .dio
                  .interceptors
                  .firstWhere((element) => element is ApiKeyAuthInterceptor)
              as ApiKeyAuthInterceptor)
          .apiKeys
          .remove(name);
    }
  }

  /// Get AlertsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AlertsApi getAlertsApi() {
    return AlertsApi(dio, serializers);
  }

  /// Get AuditApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AuditApi getAuditApi() {
    return AuditApi(dio, serializers);
  }

  /// Get AuthApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AuthApi getAuthApi() {
    return AuthApi(dio, serializers);
  }

  /// Get BatteriesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  BatteriesApi getBatteriesApi() {
    return BatteriesApi(dio, serializers);
  }

  /// Get CatalogApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  CatalogApi getCatalogApi() {
    return CatalogApi(dio, serializers);
  }

  /// Get CommandsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  CommandsApi getCommandsApi() {
    return CommandsApi(dio, serializers);
  }

  /// Get CustomersApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  CustomersApi getCustomersApi() {
    return CustomersApi(dio, serializers);
  }

  /// Get FieldTasksApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  FieldTasksApi getFieldTasksApi() {
    return FieldTasksApi(dio, serializers);
  }

  /// Get HealthApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  HealthApi getHealthApi() {
    return HealthApi(dio, serializers);
  }

  /// Get InsuranceApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  InsuranceApi getInsuranceApi() {
    return InsuranceApi(dio, serializers);
  }

  /// Get KycApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  KycApi getKycApi() {
    return KycApi(dio, serializers);
  }

  /// Get LgpdApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  LgpdApi getLgpdApi() {
    return LgpdApi(dio, serializers);
  }

  /// Get MaintenanceApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  MaintenanceApi getMaintenanceApi() {
    return MaintenanceApi(dio, serializers);
  }

  /// Get PaymentsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  PaymentsApi getPaymentsApi() {
    return PaymentsApi(dio, serializers);
  }

  /// Get PricingApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  PricingApi getPricingApi() {
    return PricingApi(dio, serializers);
  }

  /// Get ReferralsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ReferralsApi getReferralsApi() {
    return ReferralsApi(dio, serializers);
  }

  /// Get RentalsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  RentalsApi getRentalsApi() {
    return RentalsApi(dio, serializers);
  }

  /// Get ReportsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ReportsApi getReportsApi() {
    return ReportsApi(dio, serializers);
  }

  /// Get ReservationsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ReservationsApi getReservationsApi() {
    return ReservationsApi(dio, serializers);
  }

  /// Get StaffApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  StaffApi getStaffApi() {
    return StaffApi(dio, serializers);
  }

  /// Get StationsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  StationsApi getStationsApi() {
    return StationsApi(dio, serializers);
  }

  /// Get SupportApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  SupportApi getSupportApi() {
    return SupportApi(dio, serializers);
  }

  /// Get VehiclesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  VehiclesApi getVehiclesApi() {
    return VehiclesApi(dio, serializers);
  }

  /// Get WalletApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  WalletApi getWalletApi() {
    return WalletApi(dio, serializers);
  }

  /// Get WebhooksApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  WebhooksApi getWebhooksApi() {
    return WebhooksApi(dio, serializers);
  }

  /// Get ZonesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ZonesApi getZonesApi() {
    return ZonesApi(dio, serializers);
  }
}
