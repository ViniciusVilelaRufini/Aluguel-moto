//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'wellbeing_response.g.dart';

/// WellbeingResponse
///
/// Properties:
/// * [ok]
/// * [note]
@BuiltValue()
abstract class WellbeingResponse
    implements Built<WellbeingResponse, WellbeingResponseBuilder> {
  @BuiltValueField(wireName: r'ok')
  bool get ok;

  @BuiltValueField(wireName: r'note')
  String? get note;

  WellbeingResponse._();

  factory WellbeingResponse([void updates(WellbeingResponseBuilder b)]) =
      _$WellbeingResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(WellbeingResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<WellbeingResponse> get serializer =>
      _$WellbeingResponseSerializer();
}

class _$WellbeingResponseSerializer
    implements PrimitiveSerializer<WellbeingResponse> {
  @override
  final Iterable<Type> types = const [WellbeingResponse, _$WellbeingResponse];

  @override
  final String wireName = r'WellbeingResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    WellbeingResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'ok';
    yield serializers.serialize(
      object.ok,
      specifiedType: const FullType(bool),
    );
    if (object.note != null) {
      yield r'note';
      yield serializers.serialize(
        object.note,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    WellbeingResponse object, {
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
    required WellbeingResponseBuilder result,
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
        case r'note':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.note = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  WellbeingResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = WellbeingResponseBuilder();
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
