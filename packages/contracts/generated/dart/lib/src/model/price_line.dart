//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'price_line.g.dart';

/// PriceLine
///
/// Properties:
/// * [code] - `unlock`, `time`, `pause`, `insurance`, `coupon`, `fee:<code>`, `subscription_covered`, `wallet`.
/// * [description]
/// * [quantity] - Minutos, horas ou dias cobrados.
/// * [unitCents]
/// * [amountCents] - Negativo para descontos.
@BuiltValue()
abstract class PriceLine implements Built<PriceLine, PriceLineBuilder> {
  /// `unlock`, `time`, `pause`, `insurance`, `coupon`, `fee:<code>`, `subscription_covered`, `wallet`.
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'description')
  String get description;

  /// Minutos, horas ou dias cobrados.
  @BuiltValueField(wireName: r'quantity')
  int? get quantity;

  @BuiltValueField(wireName: r'unitCents')
  int? get unitCents;

  /// Negativo para descontos.
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  PriceLine._();

  factory PriceLine([void updates(PriceLineBuilder b)]) = _$PriceLine;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PriceLineBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PriceLine> get serializer => _$PriceLineSerializer();
}

class _$PriceLineSerializer implements PrimitiveSerializer<PriceLine> {
  @override
  final Iterable<Type> types = const [PriceLine, _$PriceLine];

  @override
  final String wireName = r'PriceLine';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PriceLine object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    if (object.quantity != null) {
      yield r'quantity';
      yield serializers.serialize(
        object.quantity,
        specifiedType: const FullType(int),
      );
    }
    if (object.unitCents != null) {
      yield r'unitCents';
      yield serializers.serialize(
        object.unitCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PriceLine object, {
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
    required PriceLineBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'quantity':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.quantity = valueDes;
          break;
        case r'unitCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.unitCents = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PriceLine deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PriceLineBuilder();
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
