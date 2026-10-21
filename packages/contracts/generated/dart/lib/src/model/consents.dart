//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'consents.g.dart';

/// Consents
///
/// Properties:
/// * [termsVersion]
/// * [termsAccepted]
/// * [termsAcceptedAt]
/// * [locationTracking] - Rastrear a localização durante o aluguel.
/// * [locationTrackingUpdatedAt]
/// * [marketing]
/// * [updatedAt]
@BuiltValue()
abstract class Consents implements Built<Consents, ConsentsBuilder> {
  @BuiltValueField(wireName: r'termsVersion')
  String? get termsVersion;

  @BuiltValueField(wireName: r'termsAccepted')
  bool get termsAccepted;

  @BuiltValueField(wireName: r'termsAcceptedAt')
  DateTime? get termsAcceptedAt;

  /// Rastrear a localização durante o aluguel.
  @BuiltValueField(wireName: r'locationTracking')
  bool get locationTracking;

  @BuiltValueField(wireName: r'locationTrackingUpdatedAt')
  DateTime? get locationTrackingUpdatedAt;

  @BuiltValueField(wireName: r'marketing')
  bool get marketing;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime? get updatedAt;

  Consents._();

  factory Consents([void updates(ConsentsBuilder b)]) = _$Consents;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ConsentsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Consents> get serializer => _$ConsentsSerializer();
}

class _$ConsentsSerializer implements PrimitiveSerializer<Consents> {
  @override
  final Iterable<Type> types = const [Consents, _$Consents];

  @override
  final String wireName = r'Consents';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Consents object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.termsVersion != null) {
      yield r'termsVersion';
      yield serializers.serialize(
        object.termsVersion,
        specifiedType: const FullType(String),
      );
    }
    yield r'termsAccepted';
    yield serializers.serialize(
      object.termsAccepted,
      specifiedType: const FullType(bool),
    );
    if (object.termsAcceptedAt != null) {
      yield r'termsAcceptedAt';
      yield serializers.serialize(
        object.termsAcceptedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'locationTracking';
    yield serializers.serialize(
      object.locationTracking,
      specifiedType: const FullType(bool),
    );
    if (object.locationTrackingUpdatedAt != null) {
      yield r'locationTrackingUpdatedAt';
      yield serializers.serialize(
        object.locationTrackingUpdatedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'marketing';
    yield serializers.serialize(
      object.marketing,
      specifiedType: const FullType(bool),
    );
    if (object.updatedAt != null) {
      yield r'updatedAt';
      yield serializers.serialize(
        object.updatedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Consents object, {
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
    required ConsentsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'termsVersion':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.termsVersion = valueDes;
          break;
        case r'termsAccepted':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.termsAccepted = valueDes;
          break;
        case r'termsAcceptedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.termsAcceptedAt = valueDes;
          break;
        case r'locationTracking':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.locationTracking = valueDes;
          break;
        case r'locationTrackingUpdatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.locationTrackingUpdatedAt = valueDes;
          break;
        case r'marketing':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.marketing = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Consents deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ConsentsBuilder();
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
