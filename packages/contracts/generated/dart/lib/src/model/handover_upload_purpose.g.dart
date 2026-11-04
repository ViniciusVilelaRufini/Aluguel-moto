// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_upload_purpose.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const HandoverUploadPurpose _$photo = const HandoverUploadPurpose._('photo');
const HandoverUploadPurpose _$contract =
    const HandoverUploadPurpose._('contract');
const HandoverUploadPurpose _$unknownDefaultOpenApi =
    const HandoverUploadPurpose._('unknownDefaultOpenApi');

HandoverUploadPurpose _$valueOf(String name) {
  switch (name) {
    case 'photo':
      return _$photo;
    case 'contract':
      return _$contract;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<HandoverUploadPurpose> _$values =
    BuiltSet<HandoverUploadPurpose>(const <HandoverUploadPurpose>[
  _$photo,
  _$contract,
  _$unknownDefaultOpenApi,
]);

class _$HandoverUploadPurposeMeta {
  const _$HandoverUploadPurposeMeta();
  HandoverUploadPurpose get photo => _$photo;
  HandoverUploadPurpose get contract => _$contract;
  HandoverUploadPurpose get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  HandoverUploadPurpose valueOf(String name) => _$valueOf(name);
  BuiltSet<HandoverUploadPurpose> get values => _$values;
}

abstract class _$HandoverUploadPurposeMixin {
  // ignore: non_constant_identifier_names
  _$HandoverUploadPurposeMeta get HandoverUploadPurpose =>
      const _$HandoverUploadPurposeMeta();
}

Serializer<HandoverUploadPurpose> _$handoverUploadPurposeSerializer =
    _$HandoverUploadPurposeSerializer();

class _$HandoverUploadPurposeSerializer
    implements PrimitiveSerializer<HandoverUploadPurpose> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'photo': 'photo',
    'contract': 'contract',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'photo': 'photo',
    'contract': 'contract',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[HandoverUploadPurpose];
  @override
  final String wireName = 'HandoverUploadPurpose';

  @override
  Object serialize(Serializers serializers, HandoverUploadPurpose object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  HandoverUploadPurpose deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      HandoverUploadPurpose.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
