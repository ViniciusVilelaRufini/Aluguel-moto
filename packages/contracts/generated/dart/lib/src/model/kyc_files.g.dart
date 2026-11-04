// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_files.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycFiles extends KycFiles {
  @override
  final String customerId;
  @override
  final DocumentType? documentType;
  @override
  final KycFileLink? documentFront;
  @override
  final KycFileLink? documentBack;
  @override
  final KycFileLink? selfie;

  factory _$KycFiles([void Function(KycFilesBuilder)? updates]) =>
      (KycFilesBuilder()..update(updates))._build();

  _$KycFiles._(
      {required this.customerId,
      this.documentType,
      this.documentFront,
      this.documentBack,
      this.selfie})
      : super._();
  @override
  KycFiles rebuild(void Function(KycFilesBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycFilesBuilder toBuilder() => KycFilesBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycFiles &&
        customerId == other.customerId &&
        documentType == other.documentType &&
        documentFront == other.documentFront &&
        documentBack == other.documentBack &&
        selfie == other.selfie;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, documentType.hashCode);
    _$hash = $jc(_$hash, documentFront.hashCode);
    _$hash = $jc(_$hash, documentBack.hashCode);
    _$hash = $jc(_$hash, selfie.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycFiles')
          ..add('customerId', customerId)
          ..add('documentType', documentType)
          ..add('documentFront', documentFront)
          ..add('documentBack', documentBack)
          ..add('selfie', selfie))
        .toString();
  }
}

class KycFilesBuilder implements Builder<KycFiles, KycFilesBuilder> {
  _$KycFiles? _$v;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  DocumentType? _documentType;
  DocumentType? get documentType => _$this._documentType;
  set documentType(DocumentType? documentType) =>
      _$this._documentType = documentType;

  KycFileLinkBuilder? _documentFront;
  KycFileLinkBuilder get documentFront =>
      _$this._documentFront ??= KycFileLinkBuilder();
  set documentFront(KycFileLinkBuilder? documentFront) =>
      _$this._documentFront = documentFront;

  KycFileLinkBuilder? _documentBack;
  KycFileLinkBuilder get documentBack =>
      _$this._documentBack ??= KycFileLinkBuilder();
  set documentBack(KycFileLinkBuilder? documentBack) =>
      _$this._documentBack = documentBack;

  KycFileLinkBuilder? _selfie;
  KycFileLinkBuilder get selfie => _$this._selfie ??= KycFileLinkBuilder();
  set selfie(KycFileLinkBuilder? selfie) => _$this._selfie = selfie;

  KycFilesBuilder() {
    KycFiles._defaults(this);
  }

  KycFilesBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _customerId = $v.customerId;
      _documentType = $v.documentType;
      _documentFront = $v.documentFront?.toBuilder();
      _documentBack = $v.documentBack?.toBuilder();
      _selfie = $v.selfie?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycFiles other) {
    _$v = other as _$KycFiles;
  }

  @override
  void update(void Function(KycFilesBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycFiles build() => _build();

  _$KycFiles _build() {
    _$KycFiles _$result;
    try {
      _$result = _$v ??
          _$KycFiles._(
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'KycFiles', 'customerId'),
            documentType: documentType,
            documentFront: _documentFront?.build(),
            documentBack: _documentBack?.build(),
            selfie: _selfie?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'documentFront';
        _documentFront?.build();
        _$failedField = 'documentBack';
        _documentBack?.build();
        _$failedField = 'selfie';
        _selfie?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'KycFiles', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
