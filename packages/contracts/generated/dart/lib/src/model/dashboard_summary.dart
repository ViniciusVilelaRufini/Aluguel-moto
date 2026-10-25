//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_status_counts.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dashboard_summary.g.dart';

/// DashboardSummary
///
/// Properties:
/// * [generatedAt]
/// * [occupancyPct]
/// * [activeRentals]
/// * [revenueTodayCents] - Mesma definição de `FinanceReport.totalRevenueCents`, desde 00:00 de hoje (America/Sao_Paulo).
/// * [openAlerts]
/// * [vehiclesByStatus]
@BuiltValue()
abstract class DashboardSummary
    implements Built<DashboardSummary, DashboardSummaryBuilder> {
  @BuiltValueField(wireName: r'generatedAt')
  DateTime get generatedAt;

  @BuiltValueField(wireName: r'occupancyPct')
  double get occupancyPct;

  @BuiltValueField(wireName: r'activeRentals')
  int get activeRentals;

  /// Mesma definição de `FinanceReport.totalRevenueCents`, desde 00:00 de hoje (America/Sao_Paulo).
  @BuiltValueField(wireName: r'revenueTodayCents')
  int get revenueTodayCents;

  @BuiltValueField(wireName: r'openAlerts')
  int get openAlerts;

  @BuiltValueField(wireName: r'vehiclesByStatus')
  VehicleStatusCounts get vehiclesByStatus;

  DashboardSummary._();

  factory DashboardSummary([void updates(DashboardSummaryBuilder b)]) =
      _$DashboardSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DashboardSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DashboardSummary> get serializer =>
      _$DashboardSummarySerializer();
}

class _$DashboardSummarySerializer
    implements PrimitiveSerializer<DashboardSummary> {
  @override
  final Iterable<Type> types = const [DashboardSummary, _$DashboardSummary];

  @override
  final String wireName = r'DashboardSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DashboardSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'generatedAt';
    yield serializers.serialize(
      object.generatedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'occupancyPct';
    yield serializers.serialize(
      object.occupancyPct,
      specifiedType: const FullType(double),
    );
    yield r'activeRentals';
    yield serializers.serialize(
      object.activeRentals,
      specifiedType: const FullType(int),
    );
    yield r'revenueTodayCents';
    yield serializers.serialize(
      object.revenueTodayCents,
      specifiedType: const FullType(int),
    );
    yield r'openAlerts';
    yield serializers.serialize(
      object.openAlerts,
      specifiedType: const FullType(int),
    );
    yield r'vehiclesByStatus';
    yield serializers.serialize(
      object.vehiclesByStatus,
      specifiedType: const FullType(VehicleStatusCounts),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DashboardSummary object, {
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
    required DashboardSummaryBuilder result,
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
        case r'occupancyPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.occupancyPct = valueDes;
          break;
        case r'activeRentals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.activeRentals = valueDes;
          break;
        case r'revenueTodayCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.revenueTodayCents = valueDes;
          break;
        case r'openAlerts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.openAlerts = valueDes;
          break;
        case r'vehiclesByStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VehicleStatusCounts),
          ) as VehicleStatusCounts;
          result.vehiclesByStatus.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DashboardSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DashboardSummaryBuilder();
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
