// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'upload_content_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const UploadContentType _$imageSlashJpeg =
    const UploadContentType._('imageSlashJpeg');
const UploadContentType _$imageSlashPng =
    const UploadContentType._('imageSlashPng');
const UploadContentType _$imageSlashHeic =
    const UploadContentType._('imageSlashHeic');
const UploadContentType _$applicationSlashPdf =
    const UploadContentType._('applicationSlashPdf');
const UploadContentType _$unknownDefaultOpenApi =
    const UploadContentType._('unknownDefaultOpenApi');

UploadContentType _$valueOf(String name) {
  switch (name) {
    case 'imageSlashJpeg':
      return _$imageSlashJpeg;
    case 'imageSlashPng':
      return _$imageSlashPng;
    case 'imageSlashHeic':
      return _$imageSlashHeic;
    case 'applicationSlashPdf':
      return _$applicationSlashPdf;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<UploadContentType> _$values =
    BuiltSet<UploadContentType>(const <UploadContentType>[
  _$imageSlashJpeg,
  _$imageSlashPng,
  _$imageSlashHeic,
  _$applicationSlashPdf,
  _$unknownDefaultOpenApi,
]);

class _$UploadContentTypeMeta {
  const _$UploadContentTypeMeta();
  UploadContentType get imageSlashJpeg => _$imageSlashJpeg;
  UploadContentType get imageSlashPng => _$imageSlashPng;
  UploadContentType get imageSlashHeic => _$imageSlashHeic;
  UploadContentType get applicationSlashPdf => _$applicationSlashPdf;
  UploadContentType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  UploadContentType valueOf(String name) => _$valueOf(name);
  BuiltSet<UploadContentType> get values => _$values;
}

abstract class _$UploadContentTypeMixin {
  // ignore: non_constant_identifier_names
  _$UploadContentTypeMeta get UploadContentType =>
      const _$UploadContentTypeMeta();
}

Serializer<UploadContentType> _$uploadContentTypeSerializer =
    _$UploadContentTypeSerializer();

class _$UploadContentTypeSerializer
    implements PrimitiveSerializer<UploadContentType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'imageSlashJpeg': 'image/jpeg',
    'imageSlashPng': 'image/png',
    'imageSlashHeic': 'image/heic',
    'applicationSlashPdf': 'application/pdf',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'image/jpeg': 'imageSlashJpeg',
    'image/png': 'imageSlashPng',
    'image/heic': 'imageSlashHeic',
    'application/pdf': 'applicationSlashPdf',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[UploadContentType];
  @override
  final String wireName = 'UploadContentType';

  @override
  Object serialize(Serializers serializers, UploadContentType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  UploadContentType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      UploadContentType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
