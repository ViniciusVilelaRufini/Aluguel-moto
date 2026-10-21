//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/wallet_entry_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'wallet_entry.g.dart';

/// WalletEntry
///
/// Properties:
/// * [id]
/// * [type]
/// * [amountCents] - Positivo = crédito; negativo = débito.
/// * [minutes] - Variação de minutos (pacotes).
/// * [balanceAfterCents]
/// * [description]
/// * [rentalId]
/// * [paymentId]
/// * [createdById] - staff que fez o ajuste.
/// * [createdAt]
@BuiltValue()
abstract class WalletEntry implements Built<WalletEntry, WalletEntryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'type')
  WalletEntryType get type;
  // enum typeEnum {  top_up,  minute_package,  rental_charge,  refund,  adjustment,  bonus,  };

  /// Positivo = crédito; negativo = débito.
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  /// Variação de minutos (pacotes).
  @BuiltValueField(wireName: r'minutes')
  int? get minutes;

  @BuiltValueField(wireName: r'balanceAfterCents')
  int get balanceAfterCents;

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'paymentId')
  String? get paymentId;

  /// staff que fez o ajuste.
  @BuiltValueField(wireName: r'createdById')
  String? get createdById;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  WalletEntry._();

  factory WalletEntry([void updates(WalletEntryBuilder b)]) = _$WalletEntry;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(WalletEntryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<WalletEntry> get serializer => _$WalletEntrySerializer();
}

class _$WalletEntrySerializer implements PrimitiveSerializer<WalletEntry> {
  @override
  final Iterable<Type> types = const [WalletEntry, _$WalletEntry];

  @override
  final String wireName = r'WalletEntry';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    WalletEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(WalletEntryType),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.minutes != null) {
      yield r'minutes';
      yield serializers.serialize(
        object.minutes,
        specifiedType: const FullType(int),
      );
    }
    yield r'balanceAfterCents';
    yield serializers.serialize(
      object.balanceAfterCents,
      specifiedType: const FullType(int),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    if (object.paymentId != null) {
      yield r'paymentId';
      yield serializers.serialize(
        object.paymentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdById != null) {
      yield r'createdById';
      yield serializers.serialize(
        object.createdById,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    WalletEntry object, {
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
    required WalletEntryBuilder result,
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
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(WalletEntryType),
          ) as WalletEntryType;
          result.type = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'minutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.minutes = valueDes;
          break;
        case r'balanceAfterCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.balanceAfterCents = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'paymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.paymentId = valueDes;
          break;
        case r'createdById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.createdById = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  WalletEntry deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = WalletEntryBuilder();
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
