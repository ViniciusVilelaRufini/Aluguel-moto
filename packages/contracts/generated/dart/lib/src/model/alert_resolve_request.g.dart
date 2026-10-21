// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_resolve_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AlertResolveRequest extends AlertResolveRequest {
  @override
  final String resolution;

  factory _$AlertResolveRequest(
          [void Function(AlertResolveRequestBuilder)? updates]) =>
      (AlertResolveRequestBuilder()..update(updates))._build();

  _$AlertResolveRequest._({required this.resolution}) : super._();
  @override
  AlertResolveRequest rebuild(
          void Function(AlertResolveRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AlertResolveRequestBuilder toBuilder() =>
      AlertResolveRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AlertResolveRequest && resolution == other.resolution;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, resolution.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AlertResolveRequest')
          ..add('resolution', resolution))
        .toString();
  }
}

class AlertResolveRequestBuilder
    implements Builder<AlertResolveRequest, AlertResolveRequestBuilder> {
  _$AlertResolveRequest? _$v;

  String? _resolution;
  String? get resolution => _$this._resolution;
  set resolution(String? resolution) => _$this._resolution = resolution;

  AlertResolveRequestBuilder() {
    AlertResolveRequest._defaults(this);
  }

  AlertResolveRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _resolution = $v.resolution;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AlertResolveRequest other) {
    _$v = other as _$AlertResolveRequest;
  }

  @override
  void update(void Function(AlertResolveRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AlertResolveRequest build() => _build();

  _$AlertResolveRequest _build() {
    final _$result = _$v ??
        _$AlertResolveRequest._(
          resolution: BuiltValueNullFieldError.checkNotNull(
              resolution, r'AlertResolveRequest', 'resolution'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
