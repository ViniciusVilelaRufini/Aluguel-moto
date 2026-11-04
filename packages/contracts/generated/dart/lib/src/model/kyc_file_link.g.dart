// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_file_link.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycFileLink extends KycFileLink {
  @override
  final String url;
  @override
  final DateTime expiresAt;

  factory _$KycFileLink([void Function(KycFileLinkBuilder)? updates]) =>
      (KycFileLinkBuilder()..update(updates))._build();

  _$KycFileLink._({required this.url, required this.expiresAt}) : super._();
  @override
  KycFileLink rebuild(void Function(KycFileLinkBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycFileLinkBuilder toBuilder() => KycFileLinkBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycFileLink &&
        url == other.url &&
        expiresAt == other.expiresAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, url.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycFileLink')
          ..add('url', url)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class KycFileLinkBuilder implements Builder<KycFileLink, KycFileLinkBuilder> {
  _$KycFileLink? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  KycFileLinkBuilder() {
    KycFileLink._defaults(this);
  }

  KycFileLinkBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _url = $v.url;
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycFileLink other) {
    _$v = other as _$KycFileLink;
  }

  @override
  void update(void Function(KycFileLinkBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycFileLink build() => _build();

  _$KycFileLink _build() {
    final _$result = _$v ??
        _$KycFileLink._(
          url:
              BuiltValueNullFieldError.checkNotNull(url, r'KycFileLink', 'url'),
          expiresAt: BuiltValueNullFieldError.checkNotNull(
              expiresAt, r'KycFileLink', 'expiresAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
