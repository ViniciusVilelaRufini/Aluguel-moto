//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'wallet.g.dart';

/// Wallet
///
/// Properties:
/// * [balanceCents] - Soma dos lançamentos em reais.
/// * [minutesBalance] - Minutos de pacotes ainda disponíveis.
/// * [updatedAt]
/// * [topUpMinCents] - Menor recarga de valor livre aceita agora.
/// * [topUpMaxCents] - Maior recarga de valor livre aceita agora.
/// * [suggestedTopUpAmountsCents] - Valores sugeridos para os atalhos da tela de recarga (centavos).
@BuiltValue()
abstract class Wallet implements Built<Wallet, WalletBuilder> {
  /// Soma dos lançamentos em reais.
  @BuiltValueField(wireName: r'balanceCents')
  int get balanceCents;

  /// Minutos de pacotes ainda disponíveis.
  @BuiltValueField(wireName: r'minutesBalance')
  int get minutesBalance;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  /// Menor recarga de valor livre aceita agora.
  @BuiltValueField(wireName: r'topUpMinCents')
  int? get topUpMinCents;

  /// Maior recarga de valor livre aceita agora.
  @BuiltValueField(wireName: r'topUpMaxCents')
  int? get topUpMaxCents;

  /// Valores sugeridos para os atalhos da tela de recarga (centavos).
  @BuiltValueField(wireName: r'suggestedTopUpAmountsCents')
  BuiltList<int>? get suggestedTopUpAmountsCents;

  Wallet._();

  factory Wallet([void updates(WalletBuilder b)]) = _$Wallet;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(WalletBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Wallet> get serializer => _$WalletSerializer();
}

class _$WalletSerializer implements PrimitiveSerializer<Wallet> {
  @override
  final Iterable<Type> types = const [Wallet, _$Wallet];

  @override
  final String wireName = r'Wallet';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Wallet object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'balanceCents';
    yield serializers.serialize(
      object.balanceCents,
      specifiedType: const FullType(int),
    );
    yield r'minutesBalance';
    yield serializers.serialize(
      object.minutesBalance,
      specifiedType: const FullType(int),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.topUpMinCents != null) {
      yield r'topUpMinCents';
      yield serializers.serialize(
        object.topUpMinCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.topUpMaxCents != null) {
      yield r'topUpMaxCents';
      yield serializers.serialize(
        object.topUpMaxCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.suggestedTopUpAmountsCents != null) {
      yield r'suggestedTopUpAmountsCents';
      yield serializers.serialize(
        object.suggestedTopUpAmountsCents,
        specifiedType: const FullType(BuiltList, [FullType(int)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Wallet object, {
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
    required WalletBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'balanceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.balanceCents = valueDes;
          break;
        case r'minutesBalance':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minutesBalance = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        case r'topUpMinCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.topUpMinCents = valueDes;
          break;
        case r'topUpMaxCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.topUpMaxCents = valueDes;
          break;
        case r'suggestedTopUpAmountsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BuiltList, [FullType(int)]),
          ) as BuiltList<int>?;
          if (valueDes == null) continue;
          result.suggestedTopUpAmountsCents.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Wallet deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = WalletBuilder();
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
