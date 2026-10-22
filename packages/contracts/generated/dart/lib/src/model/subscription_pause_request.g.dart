// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_pause_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SubscriptionPauseRequest extends SubscriptionPauseRequest {
  @override
  final int days;

  factory _$SubscriptionPauseRequest(
          [void Function(SubscriptionPauseRequestBuilder)? updates]) =>
      (SubscriptionPauseRequestBuilder()..update(updates))._build();

  _$SubscriptionPauseRequest._({required this.days}) : super._();
  @override
  SubscriptionPauseRequest rebuild(
          void Function(SubscriptionPauseRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SubscriptionPauseRequestBuilder toBuilder() =>
      SubscriptionPauseRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SubscriptionPauseRequest && days == other.days;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, days.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SubscriptionPauseRequest')
          ..add('days', days))
        .toString();
  }
}

class SubscriptionPauseRequestBuilder
    implements
        Builder<SubscriptionPauseRequest, SubscriptionPauseRequestBuilder> {
  _$SubscriptionPauseRequest? _$v;

  int? _days;
  int? get days => _$this._days;
  set days(int? days) => _$this._days = days;

  SubscriptionPauseRequestBuilder() {
    SubscriptionPauseRequest._defaults(this);
  }

  SubscriptionPauseRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _days = $v.days;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SubscriptionPauseRequest other) {
    _$v = other as _$SubscriptionPauseRequest;
  }

  @override
  void update(void Function(SubscriptionPauseRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SubscriptionPauseRequest build() => _build();

  _$SubscriptionPauseRequest _build() {
    final _$result = _$v ??
        _$SubscriptionPauseRequest._(
          days: BuiltValueNullFieldError.checkNotNull(
              days, r'SubscriptionPauseRequest', 'days'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
