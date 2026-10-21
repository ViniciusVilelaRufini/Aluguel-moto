// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'device_registration.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DeviceRegistration extends DeviceRegistration {
  @override
  final String fcmToken;
  @override
  final DevicePlatform platform;
  @override
  final String? appVersion;

  factory _$DeviceRegistration(
          [void Function(DeviceRegistrationBuilder)? updates]) =>
      (DeviceRegistrationBuilder()..update(updates))._build();

  _$DeviceRegistration._(
      {required this.fcmToken, required this.platform, this.appVersion})
      : super._();
  @override
  DeviceRegistration rebuild(
          void Function(DeviceRegistrationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DeviceRegistrationBuilder toBuilder() =>
      DeviceRegistrationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DeviceRegistration &&
        fcmToken == other.fcmToken &&
        platform == other.platform &&
        appVersion == other.appVersion;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, fcmToken.hashCode);
    _$hash = $jc(_$hash, platform.hashCode);
    _$hash = $jc(_$hash, appVersion.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DeviceRegistration')
          ..add('fcmToken', fcmToken)
          ..add('platform', platform)
          ..add('appVersion', appVersion))
        .toString();
  }
}

class DeviceRegistrationBuilder
    implements Builder<DeviceRegistration, DeviceRegistrationBuilder> {
  _$DeviceRegistration? _$v;

  String? _fcmToken;
  String? get fcmToken => _$this._fcmToken;
  set fcmToken(String? fcmToken) => _$this._fcmToken = fcmToken;

  DevicePlatform? _platform;
  DevicePlatform? get platform => _$this._platform;
  set platform(DevicePlatform? platform) => _$this._platform = platform;

  String? _appVersion;
  String? get appVersion => _$this._appVersion;
  set appVersion(String? appVersion) => _$this._appVersion = appVersion;

  DeviceRegistrationBuilder() {
    DeviceRegistration._defaults(this);
  }

  DeviceRegistrationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _fcmToken = $v.fcmToken;
      _platform = $v.platform;
      _appVersion = $v.appVersion;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DeviceRegistration other) {
    _$v = other as _$DeviceRegistration;
  }

  @override
  void update(void Function(DeviceRegistrationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DeviceRegistration build() => _build();

  _$DeviceRegistration _build() {
    final _$result = _$v ??
        _$DeviceRegistration._(
          fcmToken: BuiltValueNullFieldError.checkNotNull(
              fcmToken, r'DeviceRegistration', 'fcmToken'),
          platform: BuiltValueNullFieldError.checkNotNull(
              platform, r'DeviceRegistration', 'platform'),
          appVersion: appVersion,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
