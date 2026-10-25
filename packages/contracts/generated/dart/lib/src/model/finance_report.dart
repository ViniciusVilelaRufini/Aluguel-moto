//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_revenue.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'finance_report.g.dart';

/// FinanceReport
///
/// Properties:
/// * [from]
/// * [to]
/// * [revenueByPlan] - Receita de aluguéis encerrados no período, por plano (custo total do aluguel).
/// * [rentalRevenueCents] - Soma de `revenueByPlan`.
/// * [subscriptionRevenueCents] - Cobranças de assinatura (semanal/mensal, inclusive renovações) pagas, criadas no período.
/// * [totalRevenueCents] - Receita = aluguéis encerrados (`rentalRevenueCents`) + assinaturas pagas (`subscriptionRevenueCents`). Não entram: caução (garantia), recargas e pacotes de minutos da carteira (`walletTopUpsCents`, crédito pré-pago que vira receita quando é usado num aluguel) e estornos (`refundsCents`, informados à parte).
/// * [depositsHeldCount] - Cauções retidas agora.
/// * [depositsHeldCents]
/// * [delinquentCustomers]
/// * [delinquentAmountCents]
/// * [refundsCents]
/// * [walletTopUpsCents]
/// * [insurancePremiumsCents]
/// * [insurancePayoutsCents] - Repasses à seguradora.
@BuiltValue()
abstract class FinanceReport
    implements Built<FinanceReport, FinanceReportBuilder> {
  @BuiltValueField(wireName: r'from')
  DateTime get from;

  @BuiltValueField(wireName: r'to')
  DateTime get to;

  /// Receita de aluguéis encerrados no período, por plano (custo total do aluguel).
  @BuiltValueField(wireName: r'revenueByPlan')
  BuiltList<PlanRevenue> get revenueByPlan;

  /// Soma de `revenueByPlan`.
  @BuiltValueField(wireName: r'rentalRevenueCents')
  int? get rentalRevenueCents;

  /// Cobranças de assinatura (semanal/mensal, inclusive renovações) pagas, criadas no período.
  @BuiltValueField(wireName: r'subscriptionRevenueCents')
  int? get subscriptionRevenueCents;

  /// Receita = aluguéis encerrados (`rentalRevenueCents`) + assinaturas pagas (`subscriptionRevenueCents`). Não entram: caução (garantia), recargas e pacotes de minutos da carteira (`walletTopUpsCents`, crédito pré-pago que vira receita quando é usado num aluguel) e estornos (`refundsCents`, informados à parte).
  @BuiltValueField(wireName: r'totalRevenueCents')
  int get totalRevenueCents;

  /// Cauções retidas agora.
  @BuiltValueField(wireName: r'depositsHeldCount')
  int get depositsHeldCount;

  @BuiltValueField(wireName: r'depositsHeldCents')
  int get depositsHeldCents;

  @BuiltValueField(wireName: r'delinquentCustomers')
  int get delinquentCustomers;

  @BuiltValueField(wireName: r'delinquentAmountCents')
  int get delinquentAmountCents;

  @BuiltValueField(wireName: r'refundsCents')
  int get refundsCents;

  @BuiltValueField(wireName: r'walletTopUpsCents')
  int? get walletTopUpsCents;

  @BuiltValueField(wireName: r'insurancePremiumsCents')
  int get insurancePremiumsCents;

  /// Repasses à seguradora.
  @BuiltValueField(wireName: r'insurancePayoutsCents')
  int get insurancePayoutsCents;

  FinanceReport._();

  factory FinanceReport([void updates(FinanceReportBuilder b)]) =
      _$FinanceReport;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FinanceReportBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FinanceReport> get serializer =>
      _$FinanceReportSerializer();
}

class _$FinanceReportSerializer implements PrimitiveSerializer<FinanceReport> {
  @override
  final Iterable<Type> types = const [FinanceReport, _$FinanceReport];

  @override
  final String wireName = r'FinanceReport';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FinanceReport object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'from';
    yield serializers.serialize(
      object.from,
      specifiedType: const FullType(DateTime),
    );
    yield r'to';
    yield serializers.serialize(
      object.to,
      specifiedType: const FullType(DateTime),
    );
    yield r'revenueByPlan';
    yield serializers.serialize(
      object.revenueByPlan,
      specifiedType: const FullType(BuiltList, [FullType(PlanRevenue)]),
    );
    if (object.rentalRevenueCents != null) {
      yield r'rentalRevenueCents';
      yield serializers.serialize(
        object.rentalRevenueCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.subscriptionRevenueCents != null) {
      yield r'subscriptionRevenueCents';
      yield serializers.serialize(
        object.subscriptionRevenueCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'totalRevenueCents';
    yield serializers.serialize(
      object.totalRevenueCents,
      specifiedType: const FullType(int),
    );
    yield r'depositsHeldCount';
    yield serializers.serialize(
      object.depositsHeldCount,
      specifiedType: const FullType(int),
    );
    yield r'depositsHeldCents';
    yield serializers.serialize(
      object.depositsHeldCents,
      specifiedType: const FullType(int),
    );
    yield r'delinquentCustomers';
    yield serializers.serialize(
      object.delinquentCustomers,
      specifiedType: const FullType(int),
    );
    yield r'delinquentAmountCents';
    yield serializers.serialize(
      object.delinquentAmountCents,
      specifiedType: const FullType(int),
    );
    yield r'refundsCents';
    yield serializers.serialize(
      object.refundsCents,
      specifiedType: const FullType(int),
    );
    if (object.walletTopUpsCents != null) {
      yield r'walletTopUpsCents';
      yield serializers.serialize(
        object.walletTopUpsCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'insurancePremiumsCents';
    yield serializers.serialize(
      object.insurancePremiumsCents,
      specifiedType: const FullType(int),
    );
    yield r'insurancePayoutsCents';
    yield serializers.serialize(
      object.insurancePayoutsCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    FinanceReport object, {
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
    required FinanceReportBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'from':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.from = valueDes;
          break;
        case r'to':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.to = valueDes;
          break;
        case r'revenueByPlan':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(PlanRevenue)]),
          ) as BuiltList<PlanRevenue>;
          result.revenueByPlan.replace(valueDes);
          break;
        case r'rentalRevenueCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.rentalRevenueCents = valueDes;
          break;
        case r'subscriptionRevenueCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.subscriptionRevenueCents = valueDes;
          break;
        case r'totalRevenueCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalRevenueCents = valueDes;
          break;
        case r'depositsHeldCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.depositsHeldCount = valueDes;
          break;
        case r'depositsHeldCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.depositsHeldCents = valueDes;
          break;
        case r'delinquentCustomers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.delinquentCustomers = valueDes;
          break;
        case r'delinquentAmountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.delinquentAmountCents = valueDes;
          break;
        case r'refundsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.refundsCents = valueDes;
          break;
        case r'walletTopUpsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.walletTopUpsCents = valueDes;
          break;
        case r'insurancePremiumsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.insurancePremiumsCents = valueDes;
          break;
        case r'insurancePayoutsCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.insurancePayoutsCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FinanceReport deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FinanceReportBuilder();
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
