//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'deposit_status.g.dart';

/// `held`/`awaiting_pix`/`failed` vêm de `RentalBillingPort.holdDeposit`; `captured`/`released` no encerramento.
class DepositStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'awaiting_pix')
  static const DepositStatus awaitingPix = _$awaitingPix;
  @BuiltValueEnumConst(wireName: r'held')
  static const DepositStatus held = _$held;
  @BuiltValueEnumConst(wireName: r'failed')
  static const DepositStatus failed = _$failed;
  @BuiltValueEnumConst(wireName: r'captured')
  static const DepositStatus captured = _$captured;
  @BuiltValueEnumConst(wireName: r'released')
  static const DepositStatus released = _$released;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DepositStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<DepositStatus> get serializer => _$depositStatusSerializer;

  const DepositStatus._(String name) : super(name);

  static BuiltSet<DepositStatus> get values => _$values;
  static DepositStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DepositStatusMixin = Object with _$DepositStatusMixin;
