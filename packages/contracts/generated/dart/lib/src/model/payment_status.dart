//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_status.g.dart';

/// `pending → authorized → captured | canceled`; `pending → paid`; `paid | captured → refunded | partially_refunded`; `* → failed`.
class PaymentStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pending')
  static const PaymentStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'authorized')
  static const PaymentStatus authorized = _$authorized;
  @BuiltValueEnumConst(wireName: r'captured')
  static const PaymentStatus captured = _$captured;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const PaymentStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'paid')
  static const PaymentStatus paid = _$paid;
  @BuiltValueEnumConst(wireName: r'refunded')
  static const PaymentStatus refunded = _$refunded;
  @BuiltValueEnumConst(wireName: r'partially_refunded')
  static const PaymentStatus partiallyRefunded = _$partiallyRefunded;
  @BuiltValueEnumConst(wireName: r'failed')
  static const PaymentStatus failed = _$failed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PaymentStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PaymentStatus> get serializer => _$paymentStatusSerializer;

  const PaymentStatus._(String name) : super(name);

  static BuiltSet<PaymentStatus> get values => _$values;
  static PaymentStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PaymentStatusMixin = Object with _$PaymentStatusMixin;
