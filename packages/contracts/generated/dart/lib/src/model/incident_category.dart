//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'incident_category.g.dart';

class IncidentCategory extends EnumClass {
  @BuiltValueEnumConst(wireName: r'vehicle_problem')
  static const IncidentCategory vehicleProblem = _$vehicleProblem;
  @BuiltValueEnumConst(wireName: r'accident')
  static const IncidentCategory accident = _$accident;
  @BuiltValueEnumConst(wireName: r'theft')
  static const IncidentCategory theft = _$theft;
  @BuiltValueEnumConst(wireName: r'app_problem')
  static const IncidentCategory appProblem = _$appProblem;
  @BuiltValueEnumConst(wireName: r'parking')
  static const IncidentCategory parking = _$parking;
  @BuiltValueEnumConst(wireName: r'other')
  static const IncidentCategory other = _$other;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const IncidentCategory unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<IncidentCategory> get serializer =>
      _$incidentCategorySerializer;

  const IncidentCategory._(String name) : super(name);

  static BuiltSet<IncidentCategory> get values => _$values;
  static IncidentCategory valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class IncidentCategoryMixin = Object with _$IncidentCategoryMixin;
