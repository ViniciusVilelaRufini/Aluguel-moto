//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot_opening_hours.g.dart';

/// Funcionamento num dia da semana, no fuso do galpão. Dia ausente na lista = fechado.
///
/// Properties:
/// * [weekday] - 0 = domingo … 6 = sábado.
/// * [opensAt] - \"HH:MM\", anterior a `closesAt`.
/// * [closesAt] - \"HH:MM\".
@BuiltValue()
abstract class DepotOpeningHours
    implements Built<DepotOpeningHours, DepotOpeningHoursBuilder> {
  /// 0 = domingo … 6 = sábado.
  @BuiltValueField(wireName: r'weekday')
  int get weekday;

  /// \"HH:MM\", anterior a `closesAt`.
  @BuiltValueField(wireName: r'opensAt')
  String get opensAt;

  /// \"HH:MM\".
  @BuiltValueField(wireName: r'closesAt')
  String get closesAt;

  DepotOpeningHours._();

  factory DepotOpeningHours([void updates(DepotOpeningHoursBuilder b)]) =
      _$DepotOpeningHours;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotOpeningHoursBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepotOpeningHours> get serializer =>
      _$DepotOpeningHoursSerializer();
}

class _$DepotOpeningHoursSerializer
    implements PrimitiveSerializer<DepotOpeningHours> {
  @override
  final Iterable<Type> types = const [DepotOpeningHours, _$DepotOpeningHours];

  @override
  final String wireName = r'DepotOpeningHours';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepotOpeningHours object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'weekday';
    yield serializers.serialize(
      object.weekday,
      specifiedType: const FullType(int),
    );
    yield r'opensAt';
    yield serializers.serialize(
      object.opensAt,
      specifiedType: const FullType(String),
    );
    yield r'closesAt';
    yield serializers.serialize(
      object.closesAt,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DepotOpeningHours object, {
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
    required DepotOpeningHoursBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'weekday':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.weekday = valueDes;
          break;
        case r'opensAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.opensAt = valueDes;
          break;
        case r'closesAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.closesAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DepotOpeningHours deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotOpeningHoursBuilder();
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
