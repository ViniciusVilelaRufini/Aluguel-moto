// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident_category.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const IncidentCategory _$vehicleProblem =
    const IncidentCategory._('vehicleProblem');
const IncidentCategory _$accident = const IncidentCategory._('accident');
const IncidentCategory _$theft = const IncidentCategory._('theft');
const IncidentCategory _$appProblem = const IncidentCategory._('appProblem');
const IncidentCategory _$parking = const IncidentCategory._('parking');
const IncidentCategory _$other = const IncidentCategory._('other');
const IncidentCategory _$unknownDefaultOpenApi =
    const IncidentCategory._('unknownDefaultOpenApi');

IncidentCategory _$valueOf(String name) {
  switch (name) {
    case 'vehicleProblem':
      return _$vehicleProblem;
    case 'accident':
      return _$accident;
    case 'theft':
      return _$theft;
    case 'appProblem':
      return _$appProblem;
    case 'parking':
      return _$parking;
    case 'other':
      return _$other;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<IncidentCategory> _$values =
    BuiltSet<IncidentCategory>(const <IncidentCategory>[
  _$vehicleProblem,
  _$accident,
  _$theft,
  _$appProblem,
  _$parking,
  _$other,
  _$unknownDefaultOpenApi,
]);

class _$IncidentCategoryMeta {
  const _$IncidentCategoryMeta();
  IncidentCategory get vehicleProblem => _$vehicleProblem;
  IncidentCategory get accident => _$accident;
  IncidentCategory get theft => _$theft;
  IncidentCategory get appProblem => _$appProblem;
  IncidentCategory get parking => _$parking;
  IncidentCategory get other => _$other;
  IncidentCategory get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  IncidentCategory valueOf(String name) => _$valueOf(name);
  BuiltSet<IncidentCategory> get values => _$values;
}

abstract class _$IncidentCategoryMixin {
  // ignore: non_constant_identifier_names
  _$IncidentCategoryMeta get IncidentCategory => const _$IncidentCategoryMeta();
}

Serializer<IncidentCategory> _$incidentCategorySerializer =
    _$IncidentCategorySerializer();

class _$IncidentCategorySerializer
    implements PrimitiveSerializer<IncidentCategory> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'vehicleProblem': 'vehicle_problem',
    'accident': 'accident',
    'theft': 'theft',
    'appProblem': 'app_problem',
    'parking': 'parking',
    'other': 'other',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'vehicle_problem': 'vehicleProblem',
    'accident': 'accident',
    'theft': 'theft',
    'app_problem': 'appProblem',
    'parking': 'parking',
    'other': 'other',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[IncidentCategory];
  @override
  final String wireName = 'IncidentCategory';

  @override
  Object serialize(Serializers serializers, IncidentCategory object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  IncidentCategory deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      IncidentCategory.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
