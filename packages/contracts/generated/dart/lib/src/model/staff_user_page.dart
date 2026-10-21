//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/staff_user.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'staff_user_page.g.dart';

/// StaffUserPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class StaffUserPage
    implements Built<StaffUserPage, StaffUserPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<StaffUser> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  StaffUserPage._();

  factory StaffUserPage([void updates(StaffUserPageBuilder b)]) =
      _$StaffUserPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StaffUserPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StaffUserPage> get serializer =>
      _$StaffUserPageSerializer();
}

class _$StaffUserPageSerializer implements PrimitiveSerializer<StaffUserPage> {
  @override
  final Iterable<Type> types = const [StaffUserPage, _$StaffUserPage];

  @override
  final String wireName = r'StaffUserPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StaffUserPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(StaffUser)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    StaffUserPage object, {
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
    required StaffUserPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(StaffUser)]),
          ) as BuiltList<StaffUser>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StaffUserPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StaffUserPageBuilder();
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
