//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'account_deletion_status.g.dart';

class AccountDeletionStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'scheduled')
  static const AccountDeletionStatus scheduled = _$scheduled;
  @BuiltValueEnumConst(wireName: r'completed')
  static const AccountDeletionStatus completed = _$completed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const AccountDeletionStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<AccountDeletionStatus> get serializer =>
      _$accountDeletionStatusSerializer;

  const AccountDeletionStatus._(String name) : super(name);

  static BuiltSet<AccountDeletionStatus> get values => _$values;
  static AccountDeletionStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AccountDeletionStatusMixin = Object
    with _$AccountDeletionStatusMixin;
