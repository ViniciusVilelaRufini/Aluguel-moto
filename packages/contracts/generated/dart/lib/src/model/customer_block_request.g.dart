// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_block_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerBlockRequest extends CustomerBlockRequest {
  @override
  final String reason;
  @override
  final bool? addToRestrictionList;

  factory _$CustomerBlockRequest(
          [void Function(CustomerBlockRequestBuilder)? updates]) =>
      (CustomerBlockRequestBuilder()..update(updates))._build();

  _$CustomerBlockRequest._({required this.reason, this.addToRestrictionList})
      : super._();
  @override
  CustomerBlockRequest rebuild(
          void Function(CustomerBlockRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerBlockRequestBuilder toBuilder() =>
      CustomerBlockRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerBlockRequest &&
        reason == other.reason &&
        addToRestrictionList == other.addToRestrictionList;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, addToRestrictionList.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerBlockRequest')
          ..add('reason', reason)
          ..add('addToRestrictionList', addToRestrictionList))
        .toString();
  }
}

class CustomerBlockRequestBuilder
    implements Builder<CustomerBlockRequest, CustomerBlockRequestBuilder> {
  _$CustomerBlockRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  bool? _addToRestrictionList;
  bool? get addToRestrictionList => _$this._addToRestrictionList;
  set addToRestrictionList(bool? addToRestrictionList) =>
      _$this._addToRestrictionList = addToRestrictionList;

  CustomerBlockRequestBuilder() {
    CustomerBlockRequest._defaults(this);
  }

  CustomerBlockRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _addToRestrictionList = $v.addToRestrictionList;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerBlockRequest other) {
    _$v = other as _$CustomerBlockRequest;
  }

  @override
  void update(void Function(CustomerBlockRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerBlockRequest build() => _build();

  _$CustomerBlockRequest _build() {
    final _$result = _$v ??
        _$CustomerBlockRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'CustomerBlockRequest', 'reason'),
          addToRestrictionList: addToRestrictionList,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
