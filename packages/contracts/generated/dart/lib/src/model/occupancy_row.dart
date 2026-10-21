//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'occupancy_row.g.dart';

/// OccupancyRow
///
/// Properties:
/// * [periodStart]
/// * [vehiclesTotal]
/// * [vehiclesRented] - Média de motos em aluguel no período.
/// * [occupancyPct]
@BuiltValue()
abstract class OccupancyRow
    implements Built<OccupancyRow, OccupancyRowBuilder> {
  @BuiltValueField(wireName: r'periodStart')
  DateTime get periodStart;

  @BuiltValueField(wireName: r'vehiclesTotal')
  int get vehiclesTotal;

  /// Média de motos em aluguel no período.
  @BuiltValueField(wireName: r'vehiclesRented')
  int get vehiclesRented;

  @BuiltValueField(wireName: r'occupancyPct')
  double get occupancyPct;

  OccupancyRow._();

  factory OccupancyRow([void updates(OccupancyRowBuilder b)]) = _$OccupancyRow;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(OccupancyRowBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<OccupancyRow> get serializer => _$OccupancyRowSerializer();
}

class _$OccupancyRowSerializer implements PrimitiveSerializer<OccupancyRow> {
  @override
  final Iterable<Type> types = const [OccupancyRow, _$OccupancyRow];

  @override
  final String wireName = r'OccupancyRow';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    OccupancyRow object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'periodStart';
    yield serializers.serialize(
      object.periodStart,
      specifiedType: const FullType(DateTime),
    );
    yield r'vehiclesTotal';
    yield serializers.serialize(
      object.vehiclesTotal,
      specifiedType: const FullType(int),
    );
    yield r'vehiclesRented';
    yield serializers.serialize(
      object.vehiclesRented,
      specifiedType: const FullType(int),
    );
    yield r'occupancyPct';
    yield serializers.serialize(
      object.occupancyPct,
      specifiedType: const FullType(double),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    OccupancyRow object, {
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
    required OccupancyRowBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'periodStart':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.periodStart = valueDes;
          break;
        case r'vehiclesTotal':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.vehiclesTotal = valueDes;
          break;
        case r'vehiclesRented':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.vehiclesRented = valueDes;
          break;
        case r'occupancyPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.occupancyPct = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  OccupancyRow deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = OccupancyRowBuilder();
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
