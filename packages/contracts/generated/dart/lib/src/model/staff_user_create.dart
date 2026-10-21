//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/staff_group.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'staff_user_create.g.dart';

/// StaffUserCreate
///
/// Properties:
/// * [email]
/// * [name]
/// * [groups]
@BuiltValue()
abstract class StaffUserCreate
    implements Built<StaffUserCreate, StaffUserCreateBuilder> {
  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'groups')
  BuiltList<StaffGroup> get groups;

  StaffUserCreate._();

  factory StaffUserCreate([void updates(StaffUserCreateBuilder b)]) =
      _$StaffUserCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StaffUserCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StaffUserCreate> get serializer =>
      _$StaffUserCreateSerializer();
}

class _$StaffUserCreateSerializer
    implements PrimitiveSerializer<StaffUserCreate> {
  @override
  final Iterable<Type> types = const [StaffUserCreate, _$StaffUserCreate];

  @override
  final String wireName = r'StaffUserCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StaffUserCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'groups';
    yield serializers.serialize(
      object.groups,
      specifiedType: const FullType(BuiltList, [FullType(StaffGroup)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    StaffUserCreate object, {
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
    required StaffUserCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'groups':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(StaffGroup)]),
          ) as BuiltList<StaffGroup>;
          result.groups.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StaffUserCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StaffUserCreateBuilder();
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
