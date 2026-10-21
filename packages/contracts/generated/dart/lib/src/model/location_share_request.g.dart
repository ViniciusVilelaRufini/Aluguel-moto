// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'location_share_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LocationShareRequest extends LocationShareRequest {
  @override
  final int? durationMinutes;

  factory _$LocationShareRequest(
          [void Function(LocationShareRequestBuilder)? updates]) =>
      (LocationShareRequestBuilder()..update(updates))._build();

  _$LocationShareRequest._({this.durationMinutes}) : super._();
  @override
  LocationShareRequest rebuild(
          void Function(LocationShareRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LocationShareRequestBuilder toBuilder() =>
      LocationShareRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LocationShareRequest &&
        durationMinutes == other.durationMinutes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LocationShareRequest')
          ..add('durationMinutes', durationMinutes))
        .toString();
  }
}

class LocationShareRequestBuilder
    implements Builder<LocationShareRequest, LocationShareRequestBuilder> {
  _$LocationShareRequest? _$v;

  int? _durationMinutes;
  int? get durationMinutes => _$this._durationMinutes;
  set durationMinutes(int? durationMinutes) =>
      _$this._durationMinutes = durationMinutes;

  LocationShareRequestBuilder() {
    LocationShareRequest._defaults(this);
  }

  LocationShareRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _durationMinutes = $v.durationMinutes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LocationShareRequest other) {
    _$v = other as _$LocationShareRequest;
  }

  @override
  void update(void Function(LocationShareRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LocationShareRequest build() => _build();

  _$LocationShareRequest _build() {
    final _$result = _$v ??
        _$LocationShareRequest._(
          durationMinutes: durationMinutes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
