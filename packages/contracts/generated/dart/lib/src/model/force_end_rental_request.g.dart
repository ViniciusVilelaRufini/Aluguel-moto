// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'force_end_rental_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ForceEndRentalRequest extends ForceEndRentalRequest {
  @override
  final String reason;

  factory _$ForceEndRentalRequest(
          [void Function(ForceEndRentalRequestBuilder)? updates]) =>
      (ForceEndRentalRequestBuilder()..update(updates))._build();

  _$ForceEndRentalRequest._({required this.reason}) : super._();
  @override
  ForceEndRentalRequest rebuild(
          void Function(ForceEndRentalRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ForceEndRentalRequestBuilder toBuilder() =>
      ForceEndRentalRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ForceEndRentalRequest && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ForceEndRentalRequest')
          ..add('reason', reason))
        .toString();
  }
}

class ForceEndRentalRequestBuilder
    implements Builder<ForceEndRentalRequest, ForceEndRentalRequestBuilder> {
  _$ForceEndRentalRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  ForceEndRentalRequestBuilder() {
    ForceEndRentalRequest._defaults(this);
  }

  ForceEndRentalRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ForceEndRentalRequest other) {
    _$v = other as _$ForceEndRentalRequest;
  }

  @override
  void update(void Function(ForceEndRentalRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ForceEndRentalRequest build() => _build();

  _$ForceEndRentalRequest _build() {
    final _$result = _$v ??
        _$ForceEndRentalRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'ForceEndRentalRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
