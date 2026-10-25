//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_kind.g.dart';

/// `debt_settlement`: quitação de uma dívida pelo cliente (`POST /payments/{id}/retry`), com `settlesPaymentId`.
class PaymentKind extends EnumClass {
  @BuiltValueEnumConst(wireName: r'rental')
  static const PaymentKind rental = _$rental;
  @BuiltValueEnumConst(wireName: r'deposit')
  static const PaymentKind deposit = _$deposit;
  @BuiltValueEnumConst(wireName: r'top_up')
  static const PaymentKind topUp = _$topUp;
  @BuiltValueEnumConst(wireName: r'subscription')
  static const PaymentKind subscription = _$subscription;
  @BuiltValueEnumConst(wireName: r'fee')
  static const PaymentKind fee = _$fee;
  @BuiltValueEnumConst(wireName: r'debt_settlement')
  static const PaymentKind debtSettlement = _$debtSettlement;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PaymentKind unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PaymentKind> get serializer => _$paymentKindSerializer;

  const PaymentKind._(String name) : super(name);

  static BuiltSet<PaymentKind> get values => _$values;
  static PaymentKind valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PaymentKindMixin = Object with _$PaymentKindMixin;
