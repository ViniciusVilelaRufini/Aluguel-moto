//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_model.g.dart';

class TrackerModel extends EnumClass {
  @BuiltValueEnumConst(wireName: r'J16')
  static const TrackerModel J16 = _$J16;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const TrackerModel unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<TrackerModel> get serializer => _$trackerModelSerializer;

  const TrackerModel._(String name) : super(name);

  static BuiltSet<TrackerModel> get values => _$values;
  static TrackerModel valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class TrackerModelMixin = Object with _$TrackerModelMixin;
