//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_console_status.g.dart';

class TrackerConsoleStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pending')
  static const TrackerConsoleStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'answered')
  static const TrackerConsoleStatus answered = _$answered;
  @BuiltValueEnumConst(wireName: r'failed')
  static const TrackerConsoleStatus failed = _$failed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const TrackerConsoleStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<TrackerConsoleStatus> get serializer =>
      _$trackerConsoleStatusSerializer;

  const TrackerConsoleStatus._(String name) : super(name);

  static BuiltSet<TrackerConsoleStatus> get values => _$values;
  static TrackerConsoleStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class TrackerConsoleStatusMixin = Object
    with _$TrackerConsoleStatusMixin;
