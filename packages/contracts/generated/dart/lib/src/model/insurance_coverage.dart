//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_coverage.g.dart';

class InsuranceCoverage extends EnumClass {
  @BuiltValueEnumConst(wireName: r'basic')
  static const InsuranceCoverage basic = _$basic;
  @BuiltValueEnumConst(wireName: r'full')
  static const InsuranceCoverage full = _$full;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const InsuranceCoverage unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<InsuranceCoverage> get serializer =>
      _$insuranceCoverageSerializer;

  const InsuranceCoverage._(String name) : super(name);

  static BuiltSet<InsuranceCoverage> get values => _$values;
  static InsuranceCoverage valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class InsuranceCoverageMixin = Object with _$InsuranceCoverageMixin;
