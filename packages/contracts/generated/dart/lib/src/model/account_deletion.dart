//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/account_deletion_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'account_deletion.g.dart';

/// AccountDeletion
///
/// Properties:
/// * [status]
/// * [requestedAt]
/// * [completedAt]
@BuiltValue()
abstract class AccountDeletion
    implements Built<AccountDeletion, AccountDeletionBuilder> {
  @BuiltValueField(wireName: r'status')
  AccountDeletionStatus get status;
  // enum statusEnum {  scheduled,  completed,  };

  @BuiltValueField(wireName: r'requestedAt')
  DateTime get requestedAt;

  @BuiltValueField(wireName: r'completedAt')
  DateTime? get completedAt;

  AccountDeletion._();

  factory AccountDeletion([void updates(AccountDeletionBuilder b)]) =
      _$AccountDeletion;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AccountDeletionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AccountDeletion> get serializer =>
      _$AccountDeletionSerializer();
}

class _$AccountDeletionSerializer
    implements PrimitiveSerializer<AccountDeletion> {
  @override
  final Iterable<Type> types = const [AccountDeletion, _$AccountDeletion];

  @override
  final String wireName = r'AccountDeletion';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AccountDeletion object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(AccountDeletionStatus),
    );
    yield r'requestedAt';
    yield serializers.serialize(
      object.requestedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.completedAt != null) {
      yield r'completedAt';
      yield serializers.serialize(
        object.completedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AccountDeletion object, {
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
    required AccountDeletionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AccountDeletionStatus),
          ) as AccountDeletionStatus;
          result.status = valueDes;
          break;
        case r'requestedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.requestedAt = valueDes;
          break;
        case r'completedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.completedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AccountDeletion deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AccountDeletionBuilder();
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
