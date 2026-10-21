// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_submit_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycSubmitRequest extends KycSubmitRequest {
  @override
  final String fullName;
  @override
  final String cpf;
  @override
  final Date birthDate;
  @override
  final DocumentType documentType;
  @override
  final String documentFrontObjectKey;
  @override
  final String? documentBackObjectKey;
  @override
  final String selfieObjectKey;
  @override
  final String? livenessSessionId;

  factory _$KycSubmitRequest(
          [void Function(KycSubmitRequestBuilder)? updates]) =>
      (KycSubmitRequestBuilder()..update(updates))._build();

  _$KycSubmitRequest._(
      {required this.fullName,
      required this.cpf,
      required this.birthDate,
      required this.documentType,
      required this.documentFrontObjectKey,
      this.documentBackObjectKey,
      required this.selfieObjectKey,
      this.livenessSessionId})
      : super._();
  @override
  KycSubmitRequest rebuild(void Function(KycSubmitRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycSubmitRequestBuilder toBuilder() =>
      KycSubmitRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycSubmitRequest &&
        fullName == other.fullName &&
        cpf == other.cpf &&
        birthDate == other.birthDate &&
        documentType == other.documentType &&
        documentFrontObjectKey == other.documentFrontObjectKey &&
        documentBackObjectKey == other.documentBackObjectKey &&
        selfieObjectKey == other.selfieObjectKey &&
        livenessSessionId == other.livenessSessionId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, fullName.hashCode);
    _$hash = $jc(_$hash, cpf.hashCode);
    _$hash = $jc(_$hash, birthDate.hashCode);
    _$hash = $jc(_$hash, documentType.hashCode);
    _$hash = $jc(_$hash, documentFrontObjectKey.hashCode);
    _$hash = $jc(_$hash, documentBackObjectKey.hashCode);
    _$hash = $jc(_$hash, selfieObjectKey.hashCode);
    _$hash = $jc(_$hash, livenessSessionId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycSubmitRequest')
          ..add('fullName', fullName)
          ..add('cpf', cpf)
          ..add('birthDate', birthDate)
          ..add('documentType', documentType)
          ..add('documentFrontObjectKey', documentFrontObjectKey)
          ..add('documentBackObjectKey', documentBackObjectKey)
          ..add('selfieObjectKey', selfieObjectKey)
          ..add('livenessSessionId', livenessSessionId))
        .toString();
  }
}

class KycSubmitRequestBuilder
    implements Builder<KycSubmitRequest, KycSubmitRequestBuilder> {
  _$KycSubmitRequest? _$v;

  String? _fullName;
  String? get fullName => _$this._fullName;
  set fullName(String? fullName) => _$this._fullName = fullName;

  String? _cpf;
  String? get cpf => _$this._cpf;
  set cpf(String? cpf) => _$this._cpf = cpf;

  Date? _birthDate;
  Date? get birthDate => _$this._birthDate;
  set birthDate(Date? birthDate) => _$this._birthDate = birthDate;

  DocumentType? _documentType;
  DocumentType? get documentType => _$this._documentType;
  set documentType(DocumentType? documentType) =>
      _$this._documentType = documentType;

  String? _documentFrontObjectKey;
  String? get documentFrontObjectKey => _$this._documentFrontObjectKey;
  set documentFrontObjectKey(String? documentFrontObjectKey) =>
      _$this._documentFrontObjectKey = documentFrontObjectKey;

  String? _documentBackObjectKey;
  String? get documentBackObjectKey => _$this._documentBackObjectKey;
  set documentBackObjectKey(String? documentBackObjectKey) =>
      _$this._documentBackObjectKey = documentBackObjectKey;

  String? _selfieObjectKey;
  String? get selfieObjectKey => _$this._selfieObjectKey;
  set selfieObjectKey(String? selfieObjectKey) =>
      _$this._selfieObjectKey = selfieObjectKey;

  String? _livenessSessionId;
  String? get livenessSessionId => _$this._livenessSessionId;
  set livenessSessionId(String? livenessSessionId) =>
      _$this._livenessSessionId = livenessSessionId;

  KycSubmitRequestBuilder() {
    KycSubmitRequest._defaults(this);
  }

  KycSubmitRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _fullName = $v.fullName;
      _cpf = $v.cpf;
      _birthDate = $v.birthDate;
      _documentType = $v.documentType;
      _documentFrontObjectKey = $v.documentFrontObjectKey;
      _documentBackObjectKey = $v.documentBackObjectKey;
      _selfieObjectKey = $v.selfieObjectKey;
      _livenessSessionId = $v.livenessSessionId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycSubmitRequest other) {
    _$v = other as _$KycSubmitRequest;
  }

  @override
  void update(void Function(KycSubmitRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycSubmitRequest build() => _build();

  _$KycSubmitRequest _build() {
    final _$result = _$v ??
        _$KycSubmitRequest._(
          fullName: BuiltValueNullFieldError.checkNotNull(
              fullName, r'KycSubmitRequest', 'fullName'),
          cpf: BuiltValueNullFieldError.checkNotNull(
              cpf, r'KycSubmitRequest', 'cpf'),
          birthDate: BuiltValueNullFieldError.checkNotNull(
              birthDate, r'KycSubmitRequest', 'birthDate'),
          documentType: BuiltValueNullFieldError.checkNotNull(
              documentType, r'KycSubmitRequest', 'documentType'),
          documentFrontObjectKey: BuiltValueNullFieldError.checkNotNull(
              documentFrontObjectKey,
              r'KycSubmitRequest',
              'documentFrontObjectKey'),
          documentBackObjectKey: documentBackObjectKey,
          selfieObjectKey: BuiltValueNullFieldError.checkNotNull(
              selfieObjectKey, r'KycSubmitRequest', 'selfieObjectKey'),
          livenessSessionId: livenessSessionId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
