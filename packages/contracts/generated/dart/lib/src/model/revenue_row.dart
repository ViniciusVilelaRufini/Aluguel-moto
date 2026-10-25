//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'revenue_row.g.dart';

/// RevenueRow
///
/// Properties:
/// * [periodStart]
/// * [planCode]
/// * [rentals]
/// * [grossCents]
/// * [discountCents]
/// * [insuranceCents]
/// * [feesCents]
/// * [walletCents] - Créditos da carteira usados nos aluguéis. `netCents` = `grossCents` − `discountCents` + `insuranceCents` + `feesCents` − `walletCents`.
/// * [refundsCents]
/// * [netCents]
@BuiltValue()
abstract class RevenueRow implements Built<RevenueRow, RevenueRowBuilder> {
  @BuiltValueField(wireName: r'periodStart')
  DateTime get periodStart;

  @BuiltValueField(wireName: r'planCode')
  PlanCode? get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'rentals')
  int get rentals;

  @BuiltValueField(wireName: r'grossCents')
  int get grossCents;

  @BuiltValueField(wireName: r'discountCents')
  int get discountCents;

  @BuiltValueField(wireName: r'insuranceCents')
  int get insuranceCents;

  @BuiltValueField(wireName: r'feesCents')
  int get feesCents;

  /// Créditos da carteira usados nos aluguéis. `netCents` = `grossCents` − `discountCents` + `insuranceCents` + `feesCents` − `walletCents`.
  @BuiltValueField(wireName: r'walletCents')
  int? get walletCents;

  @BuiltValueField(wireName: r'refundsCents')
  int? get refundsCents;

  @BuiltValueField(wireName: r'netCents')
  int get netCents;

  RevenueRow._();

  factory RevenueRow([void updates(RevenueRowBuilder b)]) = _$RevenueRow;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RevenueRowBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RevenueRow> get serializer => _$RevenueRowSerializer();
}

class _$RevenueRowSerializer implements PrimitiveSerializer<RevenueRow> {
  @override
  final Iterable<Type> types = const [RevenueRow, _$RevenueRow];

  @override
  final String wireName = r'RevenueRow';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RevenueRow object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'periodStart';
    yield serializers.serialize(
      object.periodStart,
      specifiedType: const FullType(DateTime),
    );
    if (object.planCode != null) {
      yield r'planCode';
      yield serializers.serialize(
        object.planCode,
        specifiedType: const FullType(PlanCode),
      );
    }
    yield r'rentals';
    yield serializers.serialize(
      object.rentals,
      specifiedType: const FullType(int),
    );
    yield r'grossCents';
    yield serializers.serialize(
      object.grossCents,
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
    if (object.walletCents != null) {
      yield r'walletCents';
      yield serializers.serialize(
        object.walletCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.refundsCents != null) {
      yield r'refundsCents';
      yield serializers.serialize(
        object.refundsCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'netCents';
    yield serializers.serialize(
      object.netCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RevenueRow object, {
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
    required RevenueRowBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'periodStart':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.periodStart = valueDes;
          break;
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PlanCode),
          ) as PlanCode?;
          if (valueDes == null) continue;
          result.planCode = valueDes;
          break;
        case r'rentals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rentals = valueDes;
          break;
        case r'grossCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.grossCents = valueDes;
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
        case r'walletCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.walletCents = valueDes;
          break;
        case r'refundsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.refundsCents = valueDes;
          break;
        case r'netCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.netCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RevenueRow deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RevenueRowBuilder();
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
