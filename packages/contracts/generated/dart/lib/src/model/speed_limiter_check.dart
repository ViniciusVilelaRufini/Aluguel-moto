//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'speed_limiter_check.g.dart';

/// SpeedLimiterCheck
///
/// Properties:
/// * [ok]
/// * [configuredMaxKmh] - Velocidade máxima configurada no controlador. Acima de 32 km/h é rejeitado.
/// * [notes]
@BuiltValue()
abstract class SpeedLimiterCheck
    implements Built<SpeedLimiterCheck, SpeedLimiterCheckBuilder> {
  @BuiltValueField(wireName: r'ok')
  bool get ok;

  /// Velocidade máxima configurada no controlador. Acima de 32 km/h é rejeitado.
  @BuiltValueField(wireName: r'configuredMaxKmh')
  int get configuredMaxKmh;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  SpeedLimiterCheck._();

  factory SpeedLimiterCheck([void updates(SpeedLimiterCheckBuilder b)]) =
      _$SpeedLimiterCheck;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SpeedLimiterCheckBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SpeedLimiterCheck> get serializer =>
      _$SpeedLimiterCheckSerializer();
}

class _$SpeedLimiterCheckSerializer
    implements PrimitiveSerializer<SpeedLimiterCheck> {
  @override
  final Iterable<Type> types = const [SpeedLimiterCheck, _$SpeedLimiterCheck];

  @override
  final String wireName = r'SpeedLimiterCheck';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SpeedLimiterCheck object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'ok';
    yield serializers.serialize(
      object.ok,
      specifiedType: const FullType(bool),
    );
    yield r'configuredMaxKmh';
    yield serializers.serialize(
      object.configuredMaxKmh,
      specifiedType: const FullType(int),
    );
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SpeedLimiterCheck object, {
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
    required SpeedLimiterCheckBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'ok':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.ok = valueDes;
          break;
        case r'configuredMaxKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.configuredMaxKmh = valueDes;
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SpeedLimiterCheck deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SpeedLimiterCheckBuilder();
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
