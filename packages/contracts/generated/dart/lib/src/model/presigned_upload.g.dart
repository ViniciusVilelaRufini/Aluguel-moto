// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'presigned_upload.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PresignedUploadMethodEnum _$presignedUploadMethodEnum_PUT =
    const PresignedUploadMethodEnum._('PUT');
const PresignedUploadMethodEnum
    _$presignedUploadMethodEnum_unknownDefaultOpenApi =
    const PresignedUploadMethodEnum._('unknownDefaultOpenApi');

PresignedUploadMethodEnum _$presignedUploadMethodEnumValueOf(String name) {
  switch (name) {
    case 'PUT':
      return _$presignedUploadMethodEnum_PUT;
    case 'unknownDefaultOpenApi':
      return _$presignedUploadMethodEnum_unknownDefaultOpenApi;
    default:
      return _$presignedUploadMethodEnum_unknownDefaultOpenApi;
  }
}

final BuiltSet<PresignedUploadMethodEnum> _$presignedUploadMethodEnumValues =
    BuiltSet<PresignedUploadMethodEnum>(const <PresignedUploadMethodEnum>[
  _$presignedUploadMethodEnum_PUT,
  _$presignedUploadMethodEnum_unknownDefaultOpenApi,
]);

Serializer<PresignedUploadMethodEnum> _$presignedUploadMethodEnumSerializer =
    _$PresignedUploadMethodEnumSerializer();

class _$PresignedUploadMethodEnumSerializer
    implements PrimitiveSerializer<PresignedUploadMethodEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'PUT': 'PUT',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'PUT': 'PUT',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PresignedUploadMethodEnum];
  @override
  final String wireName = 'PresignedUploadMethodEnum';

  @override
  Object serialize(Serializers serializers, PresignedUploadMethodEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PresignedUploadMethodEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PresignedUploadMethodEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$PresignedUpload extends PresignedUpload {
  @override
  final String objectKey;
  @override
  final String uploadUrl;
  @override
  final PresignedUploadMethodEnum method;
  @override
  final BuiltMap<String, String> headers;
  @override
  final DateTime expiresAt;

  factory _$PresignedUpload([void Function(PresignedUploadBuilder)? updates]) =>
      (PresignedUploadBuilder()..update(updates))._build();

  _$PresignedUpload._(
      {required this.objectKey,
      required this.uploadUrl,
      required this.method,
      required this.headers,
      required this.expiresAt})
      : super._();
  @override
  PresignedUpload rebuild(void Function(PresignedUploadBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PresignedUploadBuilder toBuilder() => PresignedUploadBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PresignedUpload &&
        objectKey == other.objectKey &&
        uploadUrl == other.uploadUrl &&
        method == other.method &&
        headers == other.headers &&
        expiresAt == other.expiresAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, objectKey.hashCode);
    _$hash = $jc(_$hash, uploadUrl.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, headers.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PresignedUpload')
          ..add('objectKey', objectKey)
          ..add('uploadUrl', uploadUrl)
          ..add('method', method)
          ..add('headers', headers)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class PresignedUploadBuilder
    implements Builder<PresignedUpload, PresignedUploadBuilder> {
  _$PresignedUpload? _$v;

  String? _objectKey;
  String? get objectKey => _$this._objectKey;
  set objectKey(String? objectKey) => _$this._objectKey = objectKey;

  String? _uploadUrl;
  String? get uploadUrl => _$this._uploadUrl;
  set uploadUrl(String? uploadUrl) => _$this._uploadUrl = uploadUrl;

  PresignedUploadMethodEnum? _method;
  PresignedUploadMethodEnum? get method => _$this._method;
  set method(PresignedUploadMethodEnum? method) => _$this._method = method;

  MapBuilder<String, String>? _headers;
  MapBuilder<String, String> get headers =>
      _$this._headers ??= MapBuilder<String, String>();
  set headers(MapBuilder<String, String>? headers) => _$this._headers = headers;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  PresignedUploadBuilder() {
    PresignedUpload._defaults(this);
  }

  PresignedUploadBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _objectKey = $v.objectKey;
      _uploadUrl = $v.uploadUrl;
      _method = $v.method;
      _headers = $v.headers.toBuilder();
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PresignedUpload other) {
    _$v = other as _$PresignedUpload;
  }

  @override
  void update(void Function(PresignedUploadBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PresignedUpload build() => _build();

  _$PresignedUpload _build() {
    _$PresignedUpload _$result;
    try {
      _$result = _$v ??
          _$PresignedUpload._(
            objectKey: BuiltValueNullFieldError.checkNotNull(
                objectKey, r'PresignedUpload', 'objectKey'),
            uploadUrl: BuiltValueNullFieldError.checkNotNull(
                uploadUrl, r'PresignedUpload', 'uploadUrl'),
            method: BuiltValueNullFieldError.checkNotNull(
                method, r'PresignedUpload', 'method'),
            headers: headers.build(),
            expiresAt: BuiltValueNullFieldError.checkNotNull(
                expiresAt, r'PresignedUpload', 'expiresAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'headers';
        headers.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'PresignedUpload', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
