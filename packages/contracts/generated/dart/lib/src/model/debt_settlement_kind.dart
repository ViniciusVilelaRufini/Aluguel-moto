//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'debt_settlement_kind.g.dart';

/// `payment`: o cliente pagou (`debt_settlement`); `manual`: o financeiro registrou a quitação (AuditLog com o motivo).
class DebtSettlementKind extends EnumClass {
  @BuiltValueEnumConst(wireName: r'payment')
  static const DebtSettlementKind payment = _$payment;
  @BuiltValueEnumConst(wireName: r'manual')
  static const DebtSettlementKind manual = _$manual;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DebtSettlementKind unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<DebtSettlementKind> get serializer =>
      _$debtSettlementKindSerializer;

  const DebtSettlementKind._(String name) : super(name);

  static BuiltSet<DebtSettlementKind> get values => _$values;
  static DebtSettlementKind valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DebtSettlementKindMixin = Object with _$DebtSettlementKindMixin;
