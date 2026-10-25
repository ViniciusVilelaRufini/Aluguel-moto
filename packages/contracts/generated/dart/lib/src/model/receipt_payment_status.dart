//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'receipt_payment_status.g.dart';

/// `paid`: recebido (cobrança aprovada, carteira/caução cobriram tudo ou dívida quitada pelo cliente ou pelo financeiro); `pending`: dívida em aberto que o cliente paga no app (`amountDueCents`); `processing`: a cobrança ainda está em andamento no gateway (retentativa ou análise), nada a pagar por enquanto.
class ReceiptPaymentStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'paid')
  static const ReceiptPaymentStatus paid = _$paid;
  @BuiltValueEnumConst(wireName: r'pending')
  static const ReceiptPaymentStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'processing')
  static const ReceiptPaymentStatus processing = _$processing;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ReceiptPaymentStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<ReceiptPaymentStatus> get serializer =>
      _$receiptPaymentStatusSerializer;

  const ReceiptPaymentStatus._(String name) : super(name);

  static BuiltSet<ReceiptPaymentStatus> get values => _$values;
  static ReceiptPaymentStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ReceiptPaymentStatusMixin = Object
    with _$ReceiptPaymentStatusMixin;
