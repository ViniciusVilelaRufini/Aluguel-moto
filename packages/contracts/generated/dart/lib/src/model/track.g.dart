// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'track.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Track extends Track {
  @override
  final String? rentalId;
  @override
  final String vehicleId;
  @override
  final BuiltList<TrackPoint> points;

  factory _$Track([void Function(TrackBuilder)? updates]) =>
      (TrackBuilder()..update(updates))._build();

  _$Track._({this.rentalId, required this.vehicleId, required this.points})
      : super._();
  @override
  Track rebuild(void Function(TrackBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackBuilder toBuilder() => TrackBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Track &&
        rentalId == other.rentalId &&
        vehicleId == other.vehicleId &&
        points == other.points;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, points.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Track')
          ..add('rentalId', rentalId)
          ..add('vehicleId', vehicleId)
          ..add('points', points))
        .toString();
  }
}

class TrackBuilder implements Builder<Track, TrackBuilder> {
  _$Track? _$v;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  ListBuilder<TrackPoint>? _points;
  ListBuilder<TrackPoint> get points =>
      _$this._points ??= ListBuilder<TrackPoint>();
  set points(ListBuilder<TrackPoint>? points) => _$this._points = points;

  TrackBuilder() {
    Track._defaults(this);
  }

  TrackBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalId = $v.rentalId;
      _vehicleId = $v.vehicleId;
      _points = $v.points.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Track other) {
    _$v = other as _$Track;
  }

  @override
  void update(void Function(TrackBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Track build() => _build();

  _$Track _build() {
    _$Track _$result;
    try {
      _$result = _$v ??
          _$Track._(
            rentalId: rentalId,
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'Track', 'vehicleId'),
            points: points.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'points';
        points.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'Track', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
