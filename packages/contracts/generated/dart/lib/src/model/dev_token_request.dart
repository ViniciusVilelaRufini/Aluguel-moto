//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/auth_pool.dart';
import 'package:volti_api/src/model/staff_group.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dev_token_request.g.dart';

/// DevTokenRequest
///
/// Properties:
/// * [sub]
/// * [email]
/// * [groups] - Grupos de staff (vazio para `pool=customer`).
/// * [pool]
@BuiltValue()
abstract class DevTokenRequest
    implements Built<DevTokenRequest, DevTokenRequestBuilder> {
  @BuiltValueField(wireName: r'sub')
  String get sub;

  @BuiltValueField(wireName: r'email')
  String get email;

  /// Grupos de staff (vazio para `pool=customer`).
  @BuiltValueField(wireName: r'groups')
  BuiltList<StaffGroup> get groups;

  @BuiltValueField(wireName: r'pool')
  AuthPool get pool;
  // enum poolEnum {  customer,  staff,  };

  DevTokenRequest._();

  factory DevTokenRequest([void updates(DevTokenRequestBuilder b)]) =
      _$DevTokenRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DevTokenRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DevTokenRequest> get serializer =>
      _$DevTokenRequestSerializer();
}

class _$DevTokenRequestSerializer
    implements PrimitiveSerializer<DevTokenRequest> {
  @override
  final Iterable<Type> types = const [DevTokenRequest, _$DevTokenRequest];

  @override
  final String wireName = r'DevTokenRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DevTokenRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'sub';
    yield serializers.serialize(
      object.sub,
      specifiedType: const FullType(String),
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
    yield r'pool';
    yield serializers.serialize(
      object.pool,
      specifiedType: const FullType(AuthPool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DevTokenRequest object, {
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
    required DevTokenRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'sub':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.sub = valueDes;
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
        case r'pool':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AuthPool),
          ) as AuthPool;
          result.pool = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DevTokenRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DevTokenRequestBuilder();
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
