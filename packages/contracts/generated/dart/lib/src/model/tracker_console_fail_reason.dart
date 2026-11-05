//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_console_fail_reason.g.dart';

class TrackerConsoleFailReason extends EnumClass {
  @BuiltValueEnumConst(wireName: r'offline')
  static const TrackerConsoleFailReason offline = _$offline;
  @BuiltValueEnumConst(wireName: r'timeout')
  static const TrackerConsoleFailReason timeout = _$timeout;
  @BuiltValueEnumConst(wireName: r'error')
  static const TrackerConsoleFailReason error = _$error;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const TrackerConsoleFailReason unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<TrackerConsoleFailReason> get serializer =>
      _$trackerConsoleFailReasonSerializer;

  const TrackerConsoleFailReason._(String name) : super(name);

  static BuiltSet<TrackerConsoleFailReason> get values => _$values;
  static TrackerConsoleFailReason valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class TrackerConsoleFailReasonMixin = Object
    with _$TrackerConsoleFailReasonMixin;
