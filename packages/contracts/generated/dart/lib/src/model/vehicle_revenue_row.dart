//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/date.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_revenue_row.g.dart';

/// VehicleRevenueRow
///
/// Properties:
/// * [vehicleId]
/// * [vehicleCode]
/// * [date] - Dia no fuso America/Sao_Paulo.
/// * [rentals]
/// * [rentedSeconds]
/// * [revenueCents]
@BuiltValue()
abstract class VehicleRevenueRow
    implements Built<VehicleRevenueRow, VehicleRevenueRowBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  /// Dia no fuso America/Sao_Paulo.
  @BuiltValueField(wireName: r'date')
  Date get date;

  @BuiltValueField(wireName: r'rentals')
  int get rentals;

  @BuiltValueField(wireName: r'rentedSeconds')
  int? get rentedSeconds;

  @BuiltValueField(wireName: r'revenueCents')
  int get revenueCents;

  VehicleRevenueRow._();

  factory VehicleRevenueRow([void updates(VehicleRevenueRowBuilder b)]) =
      _$VehicleRevenueRow;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleRevenueRowBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleRevenueRow> get serializer =>
      _$VehicleRevenueRowSerializer();
}

class _$VehicleRevenueRowSerializer
    implements PrimitiveSerializer<VehicleRevenueRow> {
  @override
  final Iterable<Type> types = const [VehicleRevenueRow, _$VehicleRevenueRow];

  @override
  final String wireName = r'VehicleRevenueRow';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleRevenueRow object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'vehicleCode';
    yield serializers.serialize(
      object.vehicleCode,
      specifiedType: const FullType(String),
    );
    yield r'date';
    yield serializers.serialize(
      object.date,
      specifiedType: const FullType(Date),
    );
    yield r'rentals';
    yield serializers.serialize(
      object.rentals,
      specifiedType: const FullType(int),
    );
    if (object.rentedSeconds != null) {
      yield r'rentedSeconds';
      yield serializers.serialize(
        object.rentedSeconds,
        specifiedType: const FullType(int),
      );
    }
    yield r'revenueCents';
    yield serializers.serialize(
      object.revenueCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleRevenueRow object, {
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
    required VehicleRevenueRowBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleCode = valueDes;
          break;
        case r'date':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Date),
          ) as Date;
          result.date = valueDes;
          break;
        case r'rentals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rentals = valueDes;
          break;
        case r'rentedSeconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.rentedSeconds = valueDes;
          break;
        case r'revenueCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.revenueCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleRevenueRow deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleRevenueRowBuilder();
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
