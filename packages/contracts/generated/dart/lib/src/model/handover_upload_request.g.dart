// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_upload_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverUploadRequest extends HandoverUploadRequest {
  @override
  final UploadContentType contentType;
  @override
  final HandoverUploadPurpose? purpose;

  factory _$HandoverUploadRequest(
          [void Function(HandoverUploadRequestBuilder)? updates]) =>
      (HandoverUploadRequestBuilder()..update(updates))._build();

  _$HandoverUploadRequest._({required this.contentType, this.purpose})
      : super._();
  @override
  HandoverUploadRequest rebuild(
          void Function(HandoverUploadRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverUploadRequestBuilder toBuilder() =>
      HandoverUploadRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverUploadRequest &&
        contentType == other.contentType &&
        purpose == other.purpose;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentType.hashCode);
    _$hash = $jc(_$hash, purpose.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HandoverUploadRequest')
          ..add('contentType', contentType)
          ..add('purpose', purpose))
        .toString();
  }
}

class HandoverUploadRequestBuilder
    implements Builder<HandoverUploadRequest, HandoverUploadRequestBuilder> {
  _$HandoverUploadRequest? _$v;

  UploadContentType? _contentType;
  UploadContentType? get contentType => _$this._contentType;
  set contentType(UploadContentType? contentType) =>
      _$this._contentType = contentType;

  HandoverUploadPurpose? _purpose;
  HandoverUploadPurpose? get purpose => _$this._purpose;
  set purpose(HandoverUploadPurpose? purpose) => _$this._purpose = purpose;

  HandoverUploadRequestBuilder() {
    HandoverUploadRequest._defaults(this);
  }

  HandoverUploadRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentType = $v.contentType;
      _purpose = $v.purpose;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverUploadRequest other) {
    _$v = other as _$HandoverUploadRequest;
  }

  @override
  void update(void Function(HandoverUploadRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverUploadRequest build() => _build();

  _$HandoverUploadRequest _build() {
    final _$result = _$v ??
        _$HandoverUploadRequest._(
          contentType: BuiltValueNullFieldError.checkNotNull(
              contentType, r'HandoverUploadRequest', 'contentType'),
          purpose: purpose,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
