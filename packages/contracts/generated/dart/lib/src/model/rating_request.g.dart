// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rating_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RatingRequest extends RatingRequest {
  @override
  final int stars;
  @override
  final String? comment;

  factory _$RatingRequest([void Function(RatingRequestBuilder)? updates]) =>
      (RatingRequestBuilder()..update(updates))._build();

  _$RatingRequest._({required this.stars, this.comment}) : super._();
  @override
  RatingRequest rebuild(void Function(RatingRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RatingRequestBuilder toBuilder() => RatingRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RatingRequest &&
        stars == other.stars &&
        comment == other.comment;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, stars.hashCode);
    _$hash = $jc(_$hash, comment.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RatingRequest')
          ..add('stars', stars)
          ..add('comment', comment))
        .toString();
  }
}

class RatingRequestBuilder
    implements Builder<RatingRequest, RatingRequestBuilder> {
  _$RatingRequest? _$v;

  int? _stars;
  int? get stars => _$this._stars;
  set stars(int? stars) => _$this._stars = stars;

  String? _comment;
  String? get comment => _$this._comment;
  set comment(String? comment) => _$this._comment = comment;

  RatingRequestBuilder() {
    RatingRequest._defaults(this);
  }

  RatingRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _stars = $v.stars;
      _comment = $v.comment;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RatingRequest other) {
    _$v = other as _$RatingRequest;
  }

  @override
  void update(void Function(RatingRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RatingRequest build() => _build();

  _$RatingRequest _build() {
    final _$result = _$v ??
        _$RatingRequest._(
          stars: BuiltValueNullFieldError.checkNotNull(
              stars, r'RatingRequest', 'stars'),
          comment: comment,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
