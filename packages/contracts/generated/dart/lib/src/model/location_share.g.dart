// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'location_share.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LocationShare extends LocationShare {
  @override
  final String url;
  @override
  final DateTime expiresAt;

  factory _$LocationShare([void Function(LocationShareBuilder)? updates]) =>
      (LocationShareBuilder()..update(updates))._build();

  _$LocationShare._({required this.url, required this.expiresAt}) : super._();
  @override
  LocationShare rebuild(void Function(LocationShareBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LocationShareBuilder toBuilder() => LocationShareBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LocationShare &&
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
    return (newBuiltValueToStringHelper(r'LocationShare')
          ..add('url', url)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class LocationShareBuilder
    implements Builder<LocationShare, LocationShareBuilder> {
  _$LocationShare? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  LocationShareBuilder() {
    LocationShare._defaults(this);
  }

  LocationShareBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _url = $v.url;
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LocationShare other) {
    _$v = other as _$LocationShare;
  }

  @override
  void update(void Function(LocationShareBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LocationShare build() => _build();

  _$LocationShare _build() {
    final _$result = _$v ??
        _$LocationShare._(
          url: BuiltValueNullFieldError.checkNotNull(
              url, r'LocationShare', 'url'),
          expiresAt: BuiltValueNullFieldError.checkNotNull(
              expiresAt, r'LocationShare', 'expiresAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
