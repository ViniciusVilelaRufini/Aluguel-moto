// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'document_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DocumentType _$rg = const DocumentType._('rg');
const DocumentType _$cnh = const DocumentType._('cnh');
const DocumentType _$rne = const DocumentType._('rne');
const DocumentType _$unknownDefaultOpenApi =
    const DocumentType._('unknownDefaultOpenApi');

DocumentType _$valueOf(String name) {
  switch (name) {
    case 'rg':
      return _$rg;
    case 'cnh':
      return _$cnh;
    case 'rne':
      return _$rne;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<DocumentType> _$values =
    BuiltSet<DocumentType>(const <DocumentType>[
  _$rg,
  _$cnh,
  _$rne,
  _$unknownDefaultOpenApi,
]);

class _$DocumentTypeMeta {
  const _$DocumentTypeMeta();
  DocumentType get rg => _$rg;
  DocumentType get cnh => _$cnh;
  DocumentType get rne => _$rne;
  DocumentType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DocumentType valueOf(String name) => _$valueOf(name);
  BuiltSet<DocumentType> get values => _$values;
}

abstract class _$DocumentTypeMixin {
  // ignore: non_constant_identifier_names
  _$DocumentTypeMeta get DocumentType => const _$DocumentTypeMeta();
}

Serializer<DocumentType> _$documentTypeSerializer = _$DocumentTypeSerializer();

class _$DocumentTypeSerializer implements PrimitiveSerializer<DocumentType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'rg': 'rg',
    'cnh': 'cnh',
    'rne': 'rne',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'rg': 'rg',
    'cnh': 'cnh',
    'rne': 'rne',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DocumentType];
  @override
  final String wireName = 'DocumentType';

  @override
  Object serialize(Serializers serializers, DocumentType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DocumentType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DocumentType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
