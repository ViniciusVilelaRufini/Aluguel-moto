//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'me_update.g.dart';

/// MeUpdate
///
/// Properties:
/// * [name]
/// * [phone] - E.164, ex. `+5511987654321`.
/// * [emergencyContactName]
/// * [emergencyContactPhone]
@BuiltValue()
abstract class MeUpdate implements Built<MeUpdate, MeUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  /// E.164, ex. `+5511987654321`.
  @BuiltValueField(wireName: r'phone')
  String? get phone;

  @BuiltValueField(wireName: r'emergencyContactName')
  String? get emergencyContactName;

  @BuiltValueField(wireName: r'emergencyContactPhone')
  String? get emergencyContactPhone;

  MeUpdate._();

  factory MeUpdate([void updates(MeUpdateBuilder b)]) = _$MeUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MeUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MeUpdate> get serializer => _$MeUpdateSerializer();
}

class _$MeUpdateSerializer implements PrimitiveSerializer<MeUpdate> {
  @override
  final Iterable<Type> types = const [MeUpdate, _$MeUpdate];

  @override
  final String wireName = r'MeUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MeUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.phone != null) {
      yield r'phone';
      yield serializers.serialize(
        object.phone,
        specifiedType: const FullType(String),
      );
    }
    if (object.emergencyContactName != null) {
      yield r'emergencyContactName';
      yield serializers.serialize(
        object.emergencyContactName,
        specifiedType: const FullType(String),
      );
    }
    if (object.emergencyContactPhone != null) {
      yield r'emergencyContactPhone';
      yield serializers.serialize(
        object.emergencyContactPhone,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    MeUpdate object, {
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
    required MeUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'phone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.phone = valueDes;
          break;
        case r'emergencyContactName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactName = valueDes;
          break;
        case r'emergencyContactPhone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactPhone = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MeUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MeUpdateBuilder();
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
