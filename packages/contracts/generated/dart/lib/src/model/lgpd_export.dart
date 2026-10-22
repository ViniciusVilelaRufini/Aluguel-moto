//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/customer_maintenance_request.dart';
import 'package:volti_api/src/model/reservation.dart';
import 'package:volti_api/src/model/consents.dart';
import 'package:volti_api/src/model/rental.dart';
import 'package:volti_api/src/model/handover.dart';
import 'package:volti_api/src/model/station_swap.dart';
import 'package:volti_api/src/model/customer_coupon.dart';
import 'package:volti_api/src/model/payment.dart';
import 'package:volti_api/src/model/subscription.dart';
import 'package:volti_api/src/model/dispute.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/customer.dart';
import 'package:volti_api/src/model/incident.dart';
import 'package:volti_api/src/model/referral_reward.dart';
import 'package:volti_api/src/model/track.dart';
import 'package:volti_api/src/model/claim.dart';
import 'package:volti_api/src/model/wallet_entry.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'lgpd_export.g.dart';

/// LgpdExport
///
/// Properties:
/// * [generatedAt]
/// * [customer]
/// * [consents]
/// * [rentals]
/// * [payments]
/// * [tracks]
/// * [walletEntries]
/// * [incidents]
/// * [disputes]
/// * [claims]
/// * [subscriptions]
/// * [coupons]
/// * [referrals] - Indicações feitas pelo titular (só o primeiro nome do amigo).
/// * [referralCode]
/// * [maintenanceRequests]
/// * [depotReservations] - Reservas de retirada no galpão (sem `pickupCode`).
/// * [handovers] - Entregas do titular (fotos só como chaves, sem links).
/// * [stationSwaps] - Trocas de bateria na estação feitas pelo titular (sem posição).
@BuiltValue()
abstract class LgpdExport implements Built<LgpdExport, LgpdExportBuilder> {
  @BuiltValueField(wireName: r'generatedAt')
  DateTime get generatedAt;

  @BuiltValueField(wireName: r'customer')
  Customer get customer;

  @BuiltValueField(wireName: r'consents')
  Consents get consents;

  @BuiltValueField(wireName: r'rentals')
  BuiltList<Rental> get rentals;

  @BuiltValueField(wireName: r'payments')
  BuiltList<Payment> get payments;

  @BuiltValueField(wireName: r'tracks')
  BuiltList<Track> get tracks;

  @BuiltValueField(wireName: r'walletEntries')
  BuiltList<WalletEntry> get walletEntries;

  @BuiltValueField(wireName: r'incidents')
  BuiltList<Incident> get incidents;

  @BuiltValueField(wireName: r'disputes')
  BuiltList<Dispute> get disputes;

  @BuiltValueField(wireName: r'claims')
  BuiltList<Claim> get claims;

  @BuiltValueField(wireName: r'subscriptions')
  BuiltList<Subscription>? get subscriptions;

  @BuiltValueField(wireName: r'coupons')
  BuiltList<CustomerCoupon>? get coupons;

  /// Indicações feitas pelo titular (só o primeiro nome do amigo).
  @BuiltValueField(wireName: r'referrals')
  BuiltList<ReferralReward>? get referrals;

  @BuiltValueField(wireName: r'referralCode')
  String? get referralCode;

  @BuiltValueField(wireName: r'maintenanceRequests')
  BuiltList<CustomerMaintenanceRequest>? get maintenanceRequests;

  /// Reservas de retirada no galpão (sem `pickupCode`).
  @BuiltValueField(wireName: r'depotReservations')
  BuiltList<Reservation>? get depotReservations;

  /// Entregas do titular (fotos só como chaves, sem links).
  @BuiltValueField(wireName: r'handovers')
  BuiltList<Handover>? get handovers;

  /// Trocas de bateria na estação feitas pelo titular (sem posição).
  @BuiltValueField(wireName: r'stationSwaps')
  BuiltList<StationSwap>? get stationSwaps;

  LgpdExport._();

  factory LgpdExport([void updates(LgpdExportBuilder b)]) = _$LgpdExport;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LgpdExportBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LgpdExport> get serializer => _$LgpdExportSerializer();
}

class _$LgpdExportSerializer implements PrimitiveSerializer<LgpdExport> {
  @override
  final Iterable<Type> types = const [LgpdExport, _$LgpdExport];

  @override
  final String wireName = r'LgpdExport';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LgpdExport object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'generatedAt';
    yield serializers.serialize(
      object.generatedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'customer';
    yield serializers.serialize(
      object.customer,
      specifiedType: const FullType(Customer),
    );
    yield r'consents';
    yield serializers.serialize(
      object.consents,
      specifiedType: const FullType(Consents),
    );
    yield r'rentals';
    yield serializers.serialize(
      object.rentals,
      specifiedType: const FullType(BuiltList, [FullType(Rental)]),
    );
    yield r'payments';
    yield serializers.serialize(
      object.payments,
      specifiedType: const FullType(BuiltList, [FullType(Payment)]),
    );
    yield r'tracks';
    yield serializers.serialize(
      object.tracks,
      specifiedType: const FullType(BuiltList, [FullType(Track)]),
    );
    yield r'walletEntries';
    yield serializers.serialize(
      object.walletEntries,
      specifiedType: const FullType(BuiltList, [FullType(WalletEntry)]),
    );
    yield r'incidents';
    yield serializers.serialize(
      object.incidents,
      specifiedType: const FullType(BuiltList, [FullType(Incident)]),
    );
    yield r'disputes';
    yield serializers.serialize(
      object.disputes,
      specifiedType: const FullType(BuiltList, [FullType(Dispute)]),
    );
    yield r'claims';
    yield serializers.serialize(
      object.claims,
      specifiedType: const FullType(BuiltList, [FullType(Claim)]),
    );
    if (object.subscriptions != null) {
      yield r'subscriptions';
      yield serializers.serialize(
        object.subscriptions,
        specifiedType: const FullType(BuiltList, [FullType(Subscription)]),
      );
    }
    if (object.coupons != null) {
      yield r'coupons';
      yield serializers.serialize(
        object.coupons,
        specifiedType: const FullType(BuiltList, [FullType(CustomerCoupon)]),
      );
    }
    if (object.referrals != null) {
      yield r'referrals';
      yield serializers.serialize(
        object.referrals,
        specifiedType: const FullType(BuiltList, [FullType(ReferralReward)]),
      );
    }
    if (object.referralCode != null) {
      yield r'referralCode';
      yield serializers.serialize(
        object.referralCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.maintenanceRequests != null) {
      yield r'maintenanceRequests';
      yield serializers.serialize(
        object.maintenanceRequests,
        specifiedType:
            const FullType(BuiltList, [FullType(CustomerMaintenanceRequest)]),
      );
    }
    if (object.depotReservations != null) {
      yield r'depotReservations';
      yield serializers.serialize(
        object.depotReservations,
        specifiedType: const FullType(BuiltList, [FullType(Reservation)]),
      );
    }
    if (object.handovers != null) {
      yield r'handovers';
      yield serializers.serialize(
        object.handovers,
        specifiedType: const FullType(BuiltList, [FullType(Handover)]),
      );
    }
    if (object.stationSwaps != null) {
      yield r'stationSwaps';
      yield serializers.serialize(
        object.stationSwaps,
        specifiedType: const FullType(BuiltList, [FullType(StationSwap)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    LgpdExport object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LgpdExportBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'generatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.generatedAt = valueDes;
          break;
        case r'customer':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Customer),
          ) as Customer;
          result.customer.replace(valueDes);
          break;
        case r'consents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Consents),
          ) as Consents;
          result.consents.replace(valueDes);
          break;
        case r'rentals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Rental)]),
          ) as BuiltList<Rental>;
          result.rentals.replace(valueDes);
          break;
        case r'payments':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Payment)]),
          ) as BuiltList<Payment>;
          result.payments.replace(valueDes);
          break;
        case r'tracks':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Track)]),
          ) as BuiltList<Track>;
          result.tracks.replace(valueDes);
          break;
        case r'walletEntries':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(WalletEntry)]),
          ) as BuiltList<WalletEntry>;
          result.walletEntries.replace(valueDes);
          break;
        case r'incidents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Incident)]),
          ) as BuiltList<Incident>;
          result.incidents.replace(valueDes);
          break;
        case r'disputes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Dispute)]),
          ) as BuiltList<Dispute>;
          result.disputes.replace(valueDes);
          break;
        case r'claims':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Claim)]),
          ) as BuiltList<Claim>;
          result.claims.replace(valueDes);
          break;
        case r'subscriptions':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(Subscription)]),
          ) as BuiltList<Subscription>?;
          if (valueDes == null) continue;
          result.subscriptions.replace(valueDes);
          break;
        case r'coupons':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(CustomerCoupon)]),
          ) as BuiltList<CustomerCoupon>?;
          if (valueDes == null) continue;
          result.coupons.replace(valueDes);
          break;
        case r'referrals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(ReferralReward)]),
          ) as BuiltList<ReferralReward>?;
          if (valueDes == null) continue;
          result.referrals.replace(valueDes);
          break;
        case r'referralCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.referralCode = valueDes;
          break;
        case r'maintenanceRequests':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(
                BuiltList, [FullType(CustomerMaintenanceRequest)]),
          ) as BuiltList<CustomerMaintenanceRequest>?;
          if (valueDes == null) continue;
          result.maintenanceRequests.replace(valueDes);
          break;
        case r'depotReservations':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(Reservation)]),
          ) as BuiltList<Reservation>?;
          if (valueDes == null) continue;
          result.depotReservations.replace(valueDes);
          break;
        case r'handovers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(Handover)]),
          ) as BuiltList<Handover>?;
          if (valueDes == null) continue;
          result.handovers.replace(valueDes);
          break;
        case r'stationSwaps':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(StationSwap)]),
          ) as BuiltList<StationSwap>?;
          if (valueDes == null) continue;
          result.stationSwaps.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LgpdExport deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LgpdExportBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
