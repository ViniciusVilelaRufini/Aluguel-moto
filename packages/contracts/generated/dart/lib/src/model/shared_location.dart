//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'shared_location.g.dart';

/// Só a posição e o horário — nenhum dado pessoal nem da moto.
///
/// Properties:
/// * [lat]
/// * [lng]
/// * [recordedAt] - Horário da última posição conhecida (UTC).
/// * [expiresAt] - Fim da validade do link (UTC); o fim do aluguel encerra antes.
@BuiltValue()
abstract class SharedLocation
    implements Built<SharedLocation, SharedLocationBuilder> {
  @BuiltValueField(wireName: r'lat')
  num get lat;

  @BuiltValueField(wireName: r'lng')
  num get lng;

  /// Horário da última posição conhecida (UTC).
  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  /// Fim da validade do link (UTC); o fim do aluguel encerra antes.
  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  SharedLocation._();

  factory SharedLocation([void updates(SharedLocationBuilder b)]) =
      _$SharedLocation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SharedLocationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SharedLocation> get serializer =>
      _$SharedLocationSerializer();
}

class _$SharedLocationSerializer
    implements PrimitiveSerializer<SharedLocation> {
  @override
  final Iterable<Type> types = const [SharedLocation, _$SharedLocation];

  @override
  final String wireName = r'SharedLocation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SharedLocation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(num),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(num),
    );
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'expiresAt';
    yield serializers.serialize(
      object.expiresAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SharedLocation object, {
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
    required SharedLocationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.lng = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SharedLocation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SharedLocationBuilder();
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
