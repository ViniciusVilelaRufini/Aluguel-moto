// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'end_rental_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$EndRentalRequest extends EndRentalRequest {
  @override
  final String returnPhotoObjectKey;

  factory _$EndRentalRequest(
          [void Function(EndRentalRequestBuilder)? updates]) =>
      (EndRentalRequestBuilder()..update(updates))._build();

  _$EndRentalRequest._({required this.returnPhotoObjectKey}) : super._();
  @override
  EndRentalRequest rebuild(void Function(EndRentalRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  EndRentalRequestBuilder toBuilder() =>
      EndRentalRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is EndRentalRequest &&
        returnPhotoObjectKey == other.returnPhotoObjectKey;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, returnPhotoObjectKey.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'EndRentalRequest')
          ..add('returnPhotoObjectKey', returnPhotoObjectKey))
        .toString();
  }
}

class EndRentalRequestBuilder
    implements Builder<EndRentalRequest, EndRentalRequestBuilder> {
  _$EndRentalRequest? _$v;

  String? _returnPhotoObjectKey;
  String? get returnPhotoObjectKey => _$this._returnPhotoObjectKey;
  set returnPhotoObjectKey(String? returnPhotoObjectKey) =>
      _$this._returnPhotoObjectKey = returnPhotoObjectKey;

  EndRentalRequestBuilder() {
    EndRentalRequest._defaults(this);
  }

  EndRentalRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _returnPhotoObjectKey = $v.returnPhotoObjectKey;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(EndRentalRequest other) {
    _$v = other as _$EndRentalRequest;
  }

  @override
  void update(void Function(EndRentalRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  EndRentalRequest build() => _build();

  _$EndRentalRequest _build() {
    final _$result = _$v ??
        _$EndRentalRequest._(
          returnPhotoObjectKey: BuiltValueNullFieldError.checkNotNull(
              returnPhotoObjectKey,
              r'EndRentalRequest',
              'returnPhotoObjectKey'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
