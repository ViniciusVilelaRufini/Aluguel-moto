// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'install_tracker_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InstallTrackerRequest extends InstallTrackerRequest {
  @override
  final String trackerId;

  factory _$InstallTrackerRequest(
          [void Function(InstallTrackerRequestBuilder)? updates]) =>
      (InstallTrackerRequestBuilder()..update(updates))._build();

  _$InstallTrackerRequest._({required this.trackerId}) : super._();
  @override
  InstallTrackerRequest rebuild(
          void Function(InstallTrackerRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InstallTrackerRequestBuilder toBuilder() =>
      InstallTrackerRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InstallTrackerRequest && trackerId == other.trackerId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, trackerId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'InstallTrackerRequest')
          ..add('trackerId', trackerId))
        .toString();
  }
}

class InstallTrackerRequestBuilder
    implements Builder<InstallTrackerRequest, InstallTrackerRequestBuilder> {
  _$InstallTrackerRequest? _$v;

  String? _trackerId;
  String? get trackerId => _$this._trackerId;
  set trackerId(String? trackerId) => _$this._trackerId = trackerId;

  InstallTrackerRequestBuilder() {
    InstallTrackerRequest._defaults(this);
  }

  InstallTrackerRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _trackerId = $v.trackerId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InstallTrackerRequest other) {
    _$v = other as _$InstallTrackerRequest;
  }

  @override
  void update(void Function(InstallTrackerRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InstallTrackerRequest build() => _build();

  _$InstallTrackerRequest _build() {
    final _$result = _$v ??
        _$InstallTrackerRequest._(
          trackerId: BuiltValueNullFieldError.checkNotNull(
              trackerId, r'InstallTrackerRequest', 'trackerId'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
