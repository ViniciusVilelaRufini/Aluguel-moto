// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consents_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ConsentsUpdate extends ConsentsUpdate {
  @override
  final String termsVersion;
  @override
  final bool termsAccepted;
  @override
  final bool locationTracking;
  @override
  final bool marketing;

  factory _$ConsentsUpdate([void Function(ConsentsUpdateBuilder)? updates]) =>
      (ConsentsUpdateBuilder()..update(updates))._build();

  _$ConsentsUpdate._(
      {required this.termsVersion,
      required this.termsAccepted,
      required this.locationTracking,
      required this.marketing})
      : super._();
  @override
  ConsentsUpdate rebuild(void Function(ConsentsUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ConsentsUpdateBuilder toBuilder() => ConsentsUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ConsentsUpdate &&
        termsVersion == other.termsVersion &&
        termsAccepted == other.termsAccepted &&
        locationTracking == other.locationTracking &&
        marketing == other.marketing;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, termsVersion.hashCode);
    _$hash = $jc(_$hash, termsAccepted.hashCode);
    _$hash = $jc(_$hash, locationTracking.hashCode);
    _$hash = $jc(_$hash, marketing.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ConsentsUpdate')
          ..add('termsVersion', termsVersion)
          ..add('termsAccepted', termsAccepted)
          ..add('locationTracking', locationTracking)
          ..add('marketing', marketing))
        .toString();
  }
}

class ConsentsUpdateBuilder
    implements Builder<ConsentsUpdate, ConsentsUpdateBuilder> {
  _$ConsentsUpdate? _$v;

  String? _termsVersion;
  String? get termsVersion => _$this._termsVersion;
  set termsVersion(String? termsVersion) => _$this._termsVersion = termsVersion;

  bool? _termsAccepted;
  bool? get termsAccepted => _$this._termsAccepted;
  set termsAccepted(bool? termsAccepted) =>
      _$this._termsAccepted = termsAccepted;

  bool? _locationTracking;
  bool? get locationTracking => _$this._locationTracking;
  set locationTracking(bool? locationTracking) =>
      _$this._locationTracking = locationTracking;

  bool? _marketing;
  bool? get marketing => _$this._marketing;
  set marketing(bool? marketing) => _$this._marketing = marketing;

  ConsentsUpdateBuilder() {
    ConsentsUpdate._defaults(this);
  }

  ConsentsUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _termsVersion = $v.termsVersion;
      _termsAccepted = $v.termsAccepted;
      _locationTracking = $v.locationTracking;
      _marketing = $v.marketing;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ConsentsUpdate other) {
    _$v = other as _$ConsentsUpdate;
  }

  @override
  void update(void Function(ConsentsUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ConsentsUpdate build() => _build();

  _$ConsentsUpdate _build() {
    final _$result = _$v ??
        _$ConsentsUpdate._(
          termsVersion: BuiltValueNullFieldError.checkNotNull(
              termsVersion, r'ConsentsUpdate', 'termsVersion'),
          termsAccepted: BuiltValueNullFieldError.checkNotNull(
              termsAccepted, r'ConsentsUpdate', 'termsAccepted'),
          locationTracking: BuiltValueNullFieldError.checkNotNull(
              locationTracking, r'ConsentsUpdate', 'locationTracking'),
          marketing: BuiltValueNullFieldError.checkNotNull(
              marketing, r'ConsentsUpdate', 'marketing'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
