// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ClaimType _$accident = const ClaimType._('accident');
const ClaimType _$theft = const ClaimType._('theft');
const ClaimType _$damage = const ClaimType._('damage');
const ClaimType _$personalInjury = const ClaimType._('personalInjury');
const ClaimType _$unknownDefaultOpenApi =
    const ClaimType._('unknownDefaultOpenApi');

ClaimType _$valueOf(String name) {
  switch (name) {
    case 'accident':
      return _$accident;
    case 'theft':
      return _$theft;
    case 'damage':
      return _$damage;
    case 'personalInjury':
      return _$personalInjury;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ClaimType> _$values = BuiltSet<ClaimType>(const <ClaimType>[
  _$accident,
  _$theft,
  _$damage,
  _$personalInjury,
  _$unknownDefaultOpenApi,
]);

class _$ClaimTypeMeta {
  const _$ClaimTypeMeta();
  ClaimType get accident => _$accident;
  ClaimType get theft => _$theft;
  ClaimType get damage => _$damage;
  ClaimType get personalInjury => _$personalInjury;
  ClaimType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ClaimType valueOf(String name) => _$valueOf(name);
  BuiltSet<ClaimType> get values => _$values;
}

abstract class _$ClaimTypeMixin {
  // ignore: non_constant_identifier_names
  _$ClaimTypeMeta get ClaimType => const _$ClaimTypeMeta();
}

Serializer<ClaimType> _$claimTypeSerializer = _$ClaimTypeSerializer();

class _$ClaimTypeSerializer implements PrimitiveSerializer<ClaimType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'accident': 'accident',
    'theft': 'theft',
    'damage': 'damage',
    'personalInjury': 'personal_injury',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'accident': 'accident',
    'theft': 'theft',
    'damage': 'damage',
    'personal_injury': 'personalInjury',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ClaimType];
  @override
  final String wireName = 'ClaimType';

  @override
  Object serialize(Serializers serializers, ClaimType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ClaimType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ClaimType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
