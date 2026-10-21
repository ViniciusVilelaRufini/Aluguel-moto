// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'upload_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$UploadRequest extends UploadRequest {
  @override
  final UploadContentType contentType;

  factory _$UploadRequest([void Function(UploadRequestBuilder)? updates]) =>
      (UploadRequestBuilder()..update(updates))._build();

  _$UploadRequest._({required this.contentType}) : super._();
  @override
  UploadRequest rebuild(void Function(UploadRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UploadRequestBuilder toBuilder() => UploadRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UploadRequest && contentType == other.contentType;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentType.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'UploadRequest')
          ..add('contentType', contentType))
        .toString();
  }
}

class UploadRequestBuilder
    implements Builder<UploadRequest, UploadRequestBuilder> {
  _$UploadRequest? _$v;

  UploadContentType? _contentType;
  UploadContentType? get contentType => _$this._contentType;
  set contentType(UploadContentType? contentType) =>
      _$this._contentType = contentType;

  UploadRequestBuilder() {
    UploadRequest._defaults(this);
  }

  UploadRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentType = $v.contentType;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(UploadRequest other) {
    _$v = other as _$UploadRequest;
  }

  @override
  void update(void Function(UploadRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UploadRequest build() => _build();

  _$UploadRequest _build() {
    final _$result = _$v ??
        _$UploadRequest._(
          contentType: BuiltValueNullFieldError.checkNotNull(
              contentType, r'UploadRequest', 'contentType'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
