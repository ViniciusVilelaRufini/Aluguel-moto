//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'consents_update.g.dart';

/// ConsentsUpdate
///
/// Properties:
/// * [termsVersion]
/// * [termsAccepted]
/// * [locationTracking]
/// * [marketing]
@BuiltValue()
abstract class ConsentsUpdate
    implements Built<ConsentsUpdate, ConsentsUpdateBuilder> {
  @BuiltValueField(wireName: r'termsVersion')
  String get termsVersion;

  @BuiltValueField(wireName: r'termsAccepted')
  bool get termsAccepted;

  @BuiltValueField(wireName: r'locationTracking')
  bool get locationTracking;

  @BuiltValueField(wireName: r'marketing')
  bool get marketing;

  ConsentsUpdate._();

  factory ConsentsUpdate([void updates(ConsentsUpdateBuilder b)]) =
      _$ConsentsUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ConsentsUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ConsentsUpdate> get serializer =>
      _$ConsentsUpdateSerializer();
}

class _$ConsentsUpdateSerializer
    implements PrimitiveSerializer<ConsentsUpdate> {
  @override
  final Iterable<Type> types = const [ConsentsUpdate, _$ConsentsUpdate];

  @override
  final String wireName = r'ConsentsUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ConsentsUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'termsVersion';
    yield serializers.serialize(
      object.termsVersion,
      specifiedType: const FullType(String),
    );
    yield r'termsAccepted';
    yield serializers.serialize(
      object.termsAccepted,
      specifiedType: const FullType(bool),
    );
    yield r'locationTracking';
    yield serializers.serialize(
      object.locationTracking,
      specifiedType: const FullType(bool),
    );
    yield r'marketing';
    yield serializers.serialize(
      object.marketing,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ConsentsUpdate object, {
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
    required ConsentsUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'termsVersion':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.termsVersion = valueDes;
          break;
        case r'termsAccepted':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.termsAccepted = valueDes;
          break;
        case r'locationTracking':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.locationTracking = valueDes;
          break;
        case r'marketing':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.marketing = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ConsentsUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ConsentsUpdateBuilder();
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
