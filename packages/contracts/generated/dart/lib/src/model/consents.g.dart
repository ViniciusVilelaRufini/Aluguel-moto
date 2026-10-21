// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consents.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Consents extends Consents {
  @override
  final String? termsVersion;
  @override
  final bool termsAccepted;
  @override
  final DateTime? termsAcceptedAt;
  @override
  final bool locationTracking;
  @override
  final DateTime? locationTrackingUpdatedAt;
  @override
  final bool marketing;
  @override
  final DateTime? updatedAt;

  factory _$Consents([void Function(ConsentsBuilder)? updates]) =>
      (ConsentsBuilder()..update(updates))._build();

  _$Consents._(
      {this.termsVersion,
      required this.termsAccepted,
      this.termsAcceptedAt,
      required this.locationTracking,
      this.locationTrackingUpdatedAt,
      required this.marketing,
      this.updatedAt})
      : super._();
  @override
  Consents rebuild(void Function(ConsentsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ConsentsBuilder toBuilder() => ConsentsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Consents &&
        termsVersion == other.termsVersion &&
        termsAccepted == other.termsAccepted &&
        termsAcceptedAt == other.termsAcceptedAt &&
        locationTracking == other.locationTracking &&
        locationTrackingUpdatedAt == other.locationTrackingUpdatedAt &&
        marketing == other.marketing &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, termsVersion.hashCode);
    _$hash = $jc(_$hash, termsAccepted.hashCode);
    _$hash = $jc(_$hash, termsAcceptedAt.hashCode);
    _$hash = $jc(_$hash, locationTracking.hashCode);
    _$hash = $jc(_$hash, locationTrackingUpdatedAt.hashCode);
    _$hash = $jc(_$hash, marketing.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Consents')
          ..add('termsVersion', termsVersion)
          ..add('termsAccepted', termsAccepted)
          ..add('termsAcceptedAt', termsAcceptedAt)
          ..add('locationTracking', locationTracking)
          ..add('locationTrackingUpdatedAt', locationTrackingUpdatedAt)
          ..add('marketing', marketing)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class ConsentsBuilder implements Builder<Consents, ConsentsBuilder> {
  _$Consents? _$v;

  String? _termsVersion;
  String? get termsVersion => _$this._termsVersion;
  set termsVersion(String? termsVersion) => _$this._termsVersion = termsVersion;

  bool? _termsAccepted;
  bool? get termsAccepted => _$this._termsAccepted;
  set termsAccepted(bool? termsAccepted) =>
      _$this._termsAccepted = termsAccepted;

  DateTime? _termsAcceptedAt;
  DateTime? get termsAcceptedAt => _$this._termsAcceptedAt;
  set termsAcceptedAt(DateTime? termsAcceptedAt) =>
      _$this._termsAcceptedAt = termsAcceptedAt;

  bool? _locationTracking;
  bool? get locationTracking => _$this._locationTracking;
  set locationTracking(bool? locationTracking) =>
      _$this._locationTracking = locationTracking;

  DateTime? _locationTrackingUpdatedAt;
  DateTime? get locationTrackingUpdatedAt => _$this._locationTrackingUpdatedAt;
  set locationTrackingUpdatedAt(DateTime? locationTrackingUpdatedAt) =>
      _$this._locationTrackingUpdatedAt = locationTrackingUpdatedAt;

  bool? _marketing;
  bool? get marketing => _$this._marketing;
  set marketing(bool? marketing) => _$this._marketing = marketing;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  ConsentsBuilder() {
    Consents._defaults(this);
  }

  ConsentsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _termsVersion = $v.termsVersion;
      _termsAccepted = $v.termsAccepted;
      _termsAcceptedAt = $v.termsAcceptedAt;
      _locationTracking = $v.locationTracking;
      _locationTrackingUpdatedAt = $v.locationTrackingUpdatedAt;
      _marketing = $v.marketing;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Consents other) {
    _$v = other as _$Consents;
  }

  @override
  void update(void Function(ConsentsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Consents build() => _build();

  _$Consents _build() {
    final _$result = _$v ??
        _$Consents._(
          termsVersion: termsVersion,
          termsAccepted: BuiltValueNullFieldError.checkNotNull(
              termsAccepted, r'Consents', 'termsAccepted'),
          termsAcceptedAt: termsAcceptedAt,
          locationTracking: BuiltValueNullFieldError.checkNotNull(
              locationTracking, r'Consents', 'locationTracking'),
          locationTrackingUpdatedAt: locationTrackingUpdatedAt,
          marketing: BuiltValueNullFieldError.checkNotNull(
              marketing, r'Consents', 'marketing'),
          updatedAt: updatedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
