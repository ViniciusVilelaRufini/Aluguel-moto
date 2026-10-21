// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_coverage.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const InsuranceCoverage _$basic = const InsuranceCoverage._('basic');
const InsuranceCoverage _$full = const InsuranceCoverage._('full');
const InsuranceCoverage _$unknownDefaultOpenApi =
    const InsuranceCoverage._('unknownDefaultOpenApi');

InsuranceCoverage _$valueOf(String name) {
  switch (name) {
    case 'basic':
      return _$basic;
    case 'full':
      return _$full;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<InsuranceCoverage> _$values =
    BuiltSet<InsuranceCoverage>(const <InsuranceCoverage>[
  _$basic,
  _$full,
  _$unknownDefaultOpenApi,
]);

class _$InsuranceCoverageMeta {
  const _$InsuranceCoverageMeta();
  InsuranceCoverage get basic => _$basic;
  InsuranceCoverage get full => _$full;
  InsuranceCoverage get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  InsuranceCoverage valueOf(String name) => _$valueOf(name);
  BuiltSet<InsuranceCoverage> get values => _$values;
}

abstract class _$InsuranceCoverageMixin {
  // ignore: non_constant_identifier_names
  _$InsuranceCoverageMeta get InsuranceCoverage =>
      const _$InsuranceCoverageMeta();
}

Serializer<InsuranceCoverage> _$insuranceCoverageSerializer =
    _$InsuranceCoverageSerializer();

class _$InsuranceCoverageSerializer
    implements PrimitiveSerializer<InsuranceCoverage> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'basic': 'basic',
    'full': 'full',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'basic': 'basic',
    'full': 'full',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[InsuranceCoverage];
  @override
  final String wireName = 'InsuranceCoverage';

  @override
  Object serialize(Serializers serializers, InsuranceCoverage object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  InsuranceCoverage deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      InsuranceCoverage.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
