//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/auth_pool.dart';
import 'package:volti_api/src/model/staff_group.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/staff_user.dart';
import 'package:volti_api/src/model/customer.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'me.g.dart';

/// Me
///
/// Properties:
/// * [id] - ID interno (Customer.id ou StaffUser.id).
/// * [sub] - `sub` do token.
/// * [pool]
/// * [email]
/// * [groups] - Grupos de staff (vazio para clientes).
/// * [customer]
/// * [staff]
@BuiltValue()
abstract class Me implements Built<Me, MeBuilder> {
  /// ID interno (Customer.id ou StaffUser.id).
  @BuiltValueField(wireName: r'id')
  String get id;

  /// `sub` do token.
  @BuiltValueField(wireName: r'sub')
  String? get sub;

  @BuiltValueField(wireName: r'pool')
  AuthPool get pool;
  // enum poolEnum {  customer,  staff,  };

  @BuiltValueField(wireName: r'email')
  String get email;

  /// Grupos de staff (vazio para clientes).
  @BuiltValueField(wireName: r'groups')
  BuiltList<StaffGroup> get groups;

  @BuiltValueField(wireName: r'customer')
  Customer? get customer;

  @BuiltValueField(wireName: r'staff')
  StaffUser? get staff;

  Me._();

  factory Me([void updates(MeBuilder b)]) = _$Me;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MeBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Me> get serializer => _$MeSerializer();
}

class _$MeSerializer implements PrimitiveSerializer<Me> {
  @override
  final Iterable<Type> types = const [Me, _$Me];

  @override
  final String wireName = r'Me';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Me object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    if (object.sub != null) {
      yield r'sub';
      yield serializers.serialize(
        object.sub,
        specifiedType: const FullType(String),
      );
    }
    yield r'pool';
    yield serializers.serialize(
      object.pool,
      specifiedType: const FullType(AuthPool),
    );
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
    yield r'groups';
    yield serializers.serialize(
      object.groups,
      specifiedType: const FullType(BuiltList, [FullType(StaffGroup)]),
    );
    if (object.customer != null) {
      yield r'customer';
      yield serializers.serialize(
        object.customer,
        specifiedType: const FullType(Customer),
      );
    }
    if (object.staff != null) {
      yield r'staff';
      yield serializers.serialize(
        object.staff,
        specifiedType: const FullType(StaffUser),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Me object, {
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
    required MeBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'sub':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.sub = valueDes;
          break;
        case r'pool':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AuthPool),
          ) as AuthPool;
          result.pool = valueDes;
          break;
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'groups':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(StaffGroup)]),
          ) as BuiltList<StaffGroup>;
          result.groups.replace(valueDes);
          break;
        case r'customer':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Customer),
          ) as Customer?;
          if (valueDes == null) continue;
          result.customer.replace(valueDes);
          break;
        case r'staff':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(StaffUser),
          ) as StaffUser?;
          if (valueDes == null) continue;
          result.staff.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Me deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MeBuilder();
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
