// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_upload_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycUploadRequest extends KycUploadRequest {
  @override
  final DocumentType documentType;
  @override
  final UploadContentType contentType;
  @override
  final bool? withBack;

  factory _$KycUploadRequest(
          [void Function(KycUploadRequestBuilder)? updates]) =>
      (KycUploadRequestBuilder()..update(updates))._build();

  _$KycUploadRequest._(
      {required this.documentType, required this.contentType, this.withBack})
      : super._();
  @override
  KycUploadRequest rebuild(void Function(KycUploadRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycUploadRequestBuilder toBuilder() =>
      KycUploadRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycUploadRequest &&
        documentType == other.documentType &&
        contentType == other.contentType &&
        withBack == other.withBack;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, documentType.hashCode);
    _$hash = $jc(_$hash, contentType.hashCode);
    _$hash = $jc(_$hash, withBack.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycUploadRequest')
          ..add('documentType', documentType)
          ..add('contentType', contentType)
          ..add('withBack', withBack))
        .toString();
  }
}

class KycUploadRequestBuilder
    implements Builder<KycUploadRequest, KycUploadRequestBuilder> {
  _$KycUploadRequest? _$v;

  DocumentType? _documentType;
  DocumentType? get documentType => _$this._documentType;
  set documentType(DocumentType? documentType) =>
      _$this._documentType = documentType;

  UploadContentType? _contentType;
  UploadContentType? get contentType => _$this._contentType;
  set contentType(UploadContentType? contentType) =>
      _$this._contentType = contentType;

  bool? _withBack;
  bool? get withBack => _$this._withBack;
  set withBack(bool? withBack) => _$this._withBack = withBack;

  KycUploadRequestBuilder() {
    KycUploadRequest._defaults(this);
  }

  KycUploadRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _documentType = $v.documentType;
      _contentType = $v.contentType;
      _withBack = $v.withBack;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycUploadRequest other) {
    _$v = other as _$KycUploadRequest;
  }

  @override
  void update(void Function(KycUploadRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycUploadRequest build() => _build();

  _$KycUploadRequest _build() {
    final _$result = _$v ??
        _$KycUploadRequest._(
          documentType: BuiltValueNullFieldError.checkNotNull(
              documentType, r'KycUploadRequest', 'documentType'),
          contentType: BuiltValueNullFieldError.checkNotNull(
              contentType, r'KycUploadRequest', 'contentType'),
          withBack: withBack,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
