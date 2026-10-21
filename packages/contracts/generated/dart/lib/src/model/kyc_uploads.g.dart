// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_uploads.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycUploads extends KycUploads {
  @override
  final PresignedUpload documentFront;
  @override
  final PresignedUpload? documentBack;
  @override
  final PresignedUpload selfie;

  factory _$KycUploads([void Function(KycUploadsBuilder)? updates]) =>
      (KycUploadsBuilder()..update(updates))._build();

  _$KycUploads._(
      {required this.documentFront, this.documentBack, required this.selfie})
      : super._();
  @override
  KycUploads rebuild(void Function(KycUploadsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycUploadsBuilder toBuilder() => KycUploadsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycUploads &&
        documentFront == other.documentFront &&
        documentBack == other.documentBack &&
        selfie == other.selfie;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, documentFront.hashCode);
    _$hash = $jc(_$hash, documentBack.hashCode);
    _$hash = $jc(_$hash, selfie.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycUploads')
          ..add('documentFront', documentFront)
          ..add('documentBack', documentBack)
          ..add('selfie', selfie))
        .toString();
  }
}

class KycUploadsBuilder implements Builder<KycUploads, KycUploadsBuilder> {
  _$KycUploads? _$v;

  PresignedUploadBuilder? _documentFront;
  PresignedUploadBuilder get documentFront =>
      _$this._documentFront ??= PresignedUploadBuilder();
  set documentFront(PresignedUploadBuilder? documentFront) =>
      _$this._documentFront = documentFront;

  PresignedUploadBuilder? _documentBack;
  PresignedUploadBuilder get documentBack =>
      _$this._documentBack ??= PresignedUploadBuilder();
  set documentBack(PresignedUploadBuilder? documentBack) =>
      _$this._documentBack = documentBack;

  PresignedUploadBuilder? _selfie;
  PresignedUploadBuilder get selfie =>
      _$this._selfie ??= PresignedUploadBuilder();
  set selfie(PresignedUploadBuilder? selfie) => _$this._selfie = selfie;

  KycUploadsBuilder() {
    KycUploads._defaults(this);
  }

  KycUploadsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _documentFront = $v.documentFront.toBuilder();
      _documentBack = $v.documentBack?.toBuilder();
      _selfie = $v.selfie.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycUploads other) {
    _$v = other as _$KycUploads;
  }

  @override
  void update(void Function(KycUploadsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycUploads build() => _build();

  _$KycUploads _build() {
    _$KycUploads _$result;
    try {
      _$result = _$v ??
          _$KycUploads._(
            documentFront: documentFront.build(),
            documentBack: _documentBack?.build(),
            selfie: selfie.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'documentFront';
        documentFront.build();
        _$failedField = 'documentBack';
        _documentBack?.build();
        _$failedField = 'selfie';
        selfie.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'KycUploads', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
