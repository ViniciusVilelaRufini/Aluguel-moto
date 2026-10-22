//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_message_status.g.dart';

class SupportMessageStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'sent')
  static const SupportMessageStatus sent = _$sent;
  @BuiltValueEnumConst(wireName: r'delivered')
  static const SupportMessageStatus delivered = _$delivered;
  @BuiltValueEnumConst(wireName: r'read')
  static const SupportMessageStatus read = _$read;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const SupportMessageStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<SupportMessageStatus> get serializer =>
      _$supportMessageStatusSerializer;

  const SupportMessageStatus._(String name) : super(name);

  static BuiltSet<SupportMessageStatus> get values => _$values;
  static SupportMessageStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class SupportMessageStatusMixin = Object
    with _$SupportMessageStatusMixin;
