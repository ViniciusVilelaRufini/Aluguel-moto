//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/payment_method.dart';
import 'package:volti_api/src/model/debt_settlement_kind.dart';
import 'package:volti_api/src/model/payment_status.dart';
import 'package:volti_api/src/model/pix_charge.dart';
import 'package:volti_api/src/model/payment_kind.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment.g.dart';

/// Payment
///
/// Properties:
/// * [id]
/// * [customerId]
/// * [rentalId]
/// * [depositId]
/// * [subscriptionId]
/// * [kind]
/// * [method]
/// * [status]
/// * [amountCents]
/// * [refundedCents]
/// * [cardLast4]
/// * [failureReason]
/// * [providerPaymentId] - staff. ID no gateway.
/// * [receiptUrl]
/// * [customerName] - staff. Nome do cliente (detalhe e listas do painel).
/// * [outstandingCents] - Saldo devedor de um pagamento `failed` de aluguel/assinatura ainda não quitado (valor − caução capturada como garantia). Ausente quando não há dívida.
/// * [debtSettledAt] - Dívida deste pagamento quitada (pelo cliente ou manualmente pelo financeiro).
/// * [debtSettlement]
/// * [settlesPaymentId] - Só em `debt_settlement`: o pagamento cuja dívida esta cobrança quita.
/// * [pix]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Payment implements Built<Payment, PaymentBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'depositId')
  String? get depositId;

  @BuiltValueField(wireName: r'subscriptionId')
  String? get subscriptionId;

  @BuiltValueField(wireName: r'kind')
  PaymentKind get kind;
  // enum kindEnum {  rental,  deposit,  top_up,  subscription,  fee,  debt_settlement,  };

  @BuiltValueField(wireName: r'method')
  PaymentMethod get method;
  // enum methodEnum {  card,  pix,  wallet,  };

  @BuiltValueField(wireName: r'status')
  PaymentStatus get status;
  // enum statusEnum {  pending,  authorized,  captured,  canceled,  paid,  refunded,  partially_refunded,  failed,  };

  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'refundedCents')
  int get refundedCents;

  @BuiltValueField(wireName: r'cardLast4')
  String? get cardLast4;

  @BuiltValueField(wireName: r'failureReason')
  String? get failureReason;

  /// staff. ID no gateway.
  @BuiltValueField(wireName: r'providerPaymentId')
  String? get providerPaymentId;

  @BuiltValueField(wireName: r'receiptUrl')
  String? get receiptUrl;

  /// staff. Nome do cliente (detalhe e listas do painel).
  @BuiltValueField(wireName: r'customerName')
  String? get customerName;

  /// Saldo devedor de um pagamento `failed` de aluguel/assinatura ainda não quitado (valor − caução capturada como garantia). Ausente quando não há dívida.
  @BuiltValueField(wireName: r'outstandingCents')
  int? get outstandingCents;

  /// Dívida deste pagamento quitada (pelo cliente ou manualmente pelo financeiro).
  @BuiltValueField(wireName: r'debtSettledAt')
  DateTime? get debtSettledAt;

  @BuiltValueField(wireName: r'debtSettlement')
  DebtSettlementKind? get debtSettlement;
  // enum debtSettlementEnum {  payment,  manual,  };

  /// Só em `debt_settlement`: o pagamento cuja dívida esta cobrança quita.
  @BuiltValueField(wireName: r'settlesPaymentId')
  String? get settlesPaymentId;

  @BuiltValueField(wireName: r'pix')
  PixCharge? get pix;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Payment._();

  factory Payment([void updates(PaymentBuilder b)]) = _$Payment;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Payment> get serializer => _$PaymentSerializer();
}

class _$PaymentSerializer implements PrimitiveSerializer<Payment> {
  @override
  final Iterable<Type> types = const [Payment, _$Payment];

  @override
  final String wireName = r'Payment';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Payment object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    if (object.depositId != null) {
      yield r'depositId';
      yield serializers.serialize(
        object.depositId,
        specifiedType: const FullType(String),
      );
    }
    if (object.subscriptionId != null) {
      yield r'subscriptionId';
      yield serializers.serialize(
        object.subscriptionId,
        specifiedType: const FullType(String),
      );
    }
    yield r'kind';
    yield serializers.serialize(
      object.kind,
      specifiedType: const FullType(PaymentKind),
    );
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(PaymentMethod),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(PaymentStatus),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    yield r'refundedCents';
    yield serializers.serialize(
      object.refundedCents,
      specifiedType: const FullType(int),
    );
    if (object.cardLast4 != null) {
      yield r'cardLast4';
      yield serializers.serialize(
        object.cardLast4,
        specifiedType: const FullType(String),
      );
    }
    if (object.failureReason != null) {
      yield r'failureReason';
      yield serializers.serialize(
        object.failureReason,
        specifiedType: const FullType(String),
      );
    }
    if (object.providerPaymentId != null) {
      yield r'providerPaymentId';
      yield serializers.serialize(
        object.providerPaymentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.receiptUrl != null) {
      yield r'receiptUrl';
      yield serializers.serialize(
        object.receiptUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.customerName != null) {
      yield r'customerName';
      yield serializers.serialize(
        object.customerName,
        specifiedType: const FullType(String),
      );
    }
    if (object.outstandingCents != null) {
      yield r'outstandingCents';
      yield serializers.serialize(
        object.outstandingCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.debtSettledAt != null) {
      yield r'debtSettledAt';
      yield serializers.serialize(
        object.debtSettledAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.debtSettlement != null) {
      yield r'debtSettlement';
      yield serializers.serialize(
        object.debtSettlement,
        specifiedType: const FullType(DebtSettlementKind),
      );
    }
    if (object.settlesPaymentId != null) {
      yield r'settlesPaymentId';
      yield serializers.serialize(
        object.settlesPaymentId,
        specifiedType: const FullType(String),
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
    Payment object, {
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
    required PaymentBuilder result,
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
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'depositId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depositId = valueDes;
          break;
        case r'subscriptionId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.subscriptionId = valueDes;
          break;
        case r'kind':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentKind),
          ) as PaymentKind;
          result.kind = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentMethod),
          ) as PaymentMethod;
          result.method = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentStatus),
          ) as PaymentStatus;
          result.status = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'refundedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.refundedCents = valueDes;
          break;
        case r'cardLast4':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardLast4 = valueDes;
          break;
        case r'failureReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.failureReason = valueDes;
          break;
        case r'providerPaymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.providerPaymentId = valueDes;
          break;
        case r'receiptUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.receiptUrl = valueDes;
          break;
        case r'customerName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerName = valueDes;
          break;
        case r'outstandingCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.outstandingCents = valueDes;
          break;
        case r'debtSettledAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.debtSettledAt = valueDes;
          break;
        case r'debtSettlement':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DebtSettlementKind),
          ) as DebtSettlementKind?;
          if (valueDes == null) continue;
          result.debtSettlement = valueDes;
          break;
        case r'settlesPaymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.settlesPaymentId = valueDes;
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
  Payment deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentBuilder();
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
