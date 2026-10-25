//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/price_line.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'price_breakdown.g.dart';

/// PriceBreakdown
///
/// Properties:
/// * [lines]
/// * [subtotalCents] - Desbloqueio + tempo + pausa.
/// * [discountCents]
/// * [insuranceCents]
/// * [feesCents]
/// * [walletAppliedCents] - Saldo da carteira abatido no fechamento (R2-01: a carteira abate primeiro). `totalCents` já vem descontado.
/// * [totalCents]
@BuiltValue()
abstract class PriceBreakdown
    implements Built<PriceBreakdown, PriceBreakdownBuilder> {
  @BuiltValueField(wireName: r'lines')
  BuiltList<PriceLine> get lines;

  /// Desbloqueio + tempo + pausa.
  @BuiltValueField(wireName: r'subtotalCents')
  int get subtotalCents;

  @BuiltValueField(wireName: r'discountCents')
  int get discountCents;

  @BuiltValueField(wireName: r'insuranceCents')
  int get insuranceCents;

  @BuiltValueField(wireName: r'feesCents')
  int get feesCents;

  /// Saldo da carteira abatido no fechamento (R2-01: a carteira abate primeiro). `totalCents` já vem descontado.
  @BuiltValueField(wireName: r'walletAppliedCents')
  int? get walletAppliedCents;

  @BuiltValueField(wireName: r'totalCents')
  int get totalCents;

  PriceBreakdown._();

  factory PriceBreakdown([void updates(PriceBreakdownBuilder b)]) =
      _$PriceBreakdown;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PriceBreakdownBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PriceBreakdown> get serializer =>
      _$PriceBreakdownSerializer();
}

class _$PriceBreakdownSerializer
    implements PrimitiveSerializer<PriceBreakdown> {
  @override
  final Iterable<Type> types = const [PriceBreakdown, _$PriceBreakdown];

  @override
  final String wireName = r'PriceBreakdown';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PriceBreakdown object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lines';
    yield serializers.serialize(
      object.lines,
      specifiedType: const FullType(BuiltList, [FullType(PriceLine)]),
    );
    yield r'subtotalCents';
    yield serializers.serialize(
      object.subtotalCents,
      specifiedType: const FullType(int),
    );
    yield r'discountCents';
    yield serializers.serialize(
      object.discountCents,
      specifiedType: const FullType(int),
    );
    yield r'insuranceCents';
    yield serializers.serialize(
      object.insuranceCents,
      specifiedType: const FullType(int),
    );
    yield r'feesCents';
    yield serializers.serialize(
      object.feesCents,
      specifiedType: const FullType(int),
    );
    if (object.walletAppliedCents != null) {
      yield r'walletAppliedCents';
      yield serializers.serialize(
        object.walletAppliedCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'totalCents';
    yield serializers.serialize(
      object.totalCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PriceBreakdown object, {
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
    required PriceBreakdownBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lines':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(PriceLine)]),
          ) as BuiltList<PriceLine>;
          result.lines.replace(valueDes);
          break;
        case r'subtotalCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.subtotalCents = valueDes;
          break;
        case r'discountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.discountCents = valueDes;
          break;
        case r'insuranceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.insuranceCents = valueDes;
          break;
        case r'feesCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.feesCents = valueDes;
          break;
        case r'walletAppliedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.walletAppliedCents = valueDes;
          break;
        case r'totalCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PriceBreakdown deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PriceBreakdownBuilder();
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
