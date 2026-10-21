//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/staff_group.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'staff_user_update.g.dart';

/// StaffUserUpdate
///
/// Properties:
/// * [name]
/// * [groups]
/// * [active]
@BuiltValue()
abstract class StaffUserUpdate
    implements Built<StaffUserUpdate, StaffUserUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'groups')
  BuiltList<StaffGroup>? get groups;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  StaffUserUpdate._();

  factory StaffUserUpdate([void updates(StaffUserUpdateBuilder b)]) =
      _$StaffUserUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StaffUserUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StaffUserUpdate> get serializer =>
      _$StaffUserUpdateSerializer();
}

class _$StaffUserUpdateSerializer
    implements PrimitiveSerializer<StaffUserUpdate> {
  @override
  final Iterable<Type> types = const [StaffUserUpdate, _$StaffUserUpdate];

  @override
  final String wireName = r'StaffUserUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StaffUserUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.groups != null) {
      yield r'groups';
      yield serializers.serialize(
        object.groups,
        specifiedType: const FullType(BuiltList, [FullType(StaffGroup)]),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    StaffUserUpdate object, {
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
    required StaffUserUpdateBuilder result,
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
        case r'groups':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(StaffGroup)]),
          ) as BuiltList<StaffGroup>?;
          if (valueDes == null) continue;
          result.groups.replace(valueDes);
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StaffUserUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StaffUserUpdateBuilder();
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
