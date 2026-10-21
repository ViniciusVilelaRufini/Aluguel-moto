//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/deposit_status.dart';
import 'package:volti_api/src/model/pix_charge.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'deposit.g.dart';

/// Deposit
///
/// Properties:
/// * [id]
/// * [rentalId] - Aluguel (ou o ID já reservado para ele no fluxo Pix).
/// * [customerId]
/// * [method]
/// * [status]
/// * [amountCents]
/// * [capturedCents]
/// * [pix]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Deposit implements Built<Deposit, DepositBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Aluguel (ou o ID já reservado para ele no fluxo Pix).
  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  @BuiltValueField(wireName: r'method')
  DepositMethod get method;
  // enum methodEnum {  card,  pix,  };

  @BuiltValueField(wireName: r'status')
  DepositStatus get status;
  // enum statusEnum {  awaiting_pix,  held,  failed,  captured,  released,  };

  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'capturedCents')
  int? get capturedCents;

  @BuiltValueField(wireName: r'pix')
  PixCharge? get pix;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Deposit._();

  factory Deposit([void updates(DepositBuilder b)]) = _$Deposit;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepositBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Deposit> get serializer => _$DepositSerializer();
}

class _$DepositSerializer implements PrimitiveSerializer<Deposit> {
  @override
  final Iterable<Type> types = const [Deposit, _$Deposit];

  @override
  final String wireName = r'Deposit';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Deposit object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(DepositMethod),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(DepositStatus),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.capturedCents != null) {
      yield r'capturedCents';
      yield serializers.serialize(
        object.capturedCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.pix != null) {
      yield r'pix';
      yield serializers.serialize(
        object.pix,
        specifiedType: const FullType(PixCharge),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Deposit object, {
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
    required DepositBuilder result,
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
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DepositMethod),
          ) as DepositMethod;
          result.method = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DepositStatus),
          ) as DepositStatus;
          result.status = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'capturedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.capturedCents = valueDes;
          break;
        case r'pix':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PixCharge),
          ) as PixCharge?;
          if (valueDes == null) continue;
          result.pix.replace(valueDes);
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
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
  Deposit deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepositBuilder();
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
