//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'wallet_entry_type.g.dart';

class WalletEntryType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'top_up')
  static const WalletEntryType topUp = _$topUp;
  @BuiltValueEnumConst(wireName: r'minute_package')
  static const WalletEntryType minutePackage = _$minutePackage;
  @BuiltValueEnumConst(wireName: r'rental_charge')
  static const WalletEntryType rentalCharge = _$rentalCharge;
  @BuiltValueEnumConst(wireName: r'refund')
  static const WalletEntryType refund = _$refund;
  @BuiltValueEnumConst(wireName: r'adjustment')
  static const WalletEntryType adjustment = _$adjustment;
  @BuiltValueEnumConst(wireName: r'bonus')
  static const WalletEntryType bonus = _$bonus;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const WalletEntryType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<WalletEntryType> get serializer =>
      _$walletEntryTypeSerializer;

  const WalletEntryType._(String name) : super(name);

  static BuiltSet<WalletEntryType> get values => _$values;
  static WalletEntryType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class WalletEntryTypeMixin = Object with _$WalletEntryTypeMixin;
