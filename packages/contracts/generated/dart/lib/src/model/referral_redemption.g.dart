// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_redemption.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReferralRedemption extends ReferralRedemption {
  @override
  final String code;
  @override
  final String? referrerName;
  @override
  final int rewardCents;
  @override
  final WalletEntry walletEntry;

  factory _$ReferralRedemption(
          [void Function(ReferralRedemptionBuilder)? updates]) =>
      (ReferralRedemptionBuilder()..update(updates))._build();

  _$ReferralRedemption._(
      {required this.code,
      this.referrerName,
      required this.rewardCents,
      required this.walletEntry})
      : super._();
  @override
  ReferralRedemption rebuild(
          void Function(ReferralRedemptionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReferralRedemptionBuilder toBuilder() =>
      ReferralRedemptionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReferralRedemption &&
        code == other.code &&
        referrerName == other.referrerName &&
        rewardCents == other.rewardCents &&
        walletEntry == other.walletEntry;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, referrerName.hashCode);
    _$hash = $jc(_$hash, rewardCents.hashCode);
    _$hash = $jc(_$hash, walletEntry.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReferralRedemption')
          ..add('code', code)
          ..add('referrerName', referrerName)
          ..add('rewardCents', rewardCents)
          ..add('walletEntry', walletEntry))
        .toString();
  }
}

class ReferralRedemptionBuilder
    implements Builder<ReferralRedemption, ReferralRedemptionBuilder> {
  _$ReferralRedemption? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _referrerName;
  String? get referrerName => _$this._referrerName;
  set referrerName(String? referrerName) => _$this._referrerName = referrerName;

  int? _rewardCents;
  int? get rewardCents => _$this._rewardCents;
  set rewardCents(int? rewardCents) => _$this._rewardCents = rewardCents;

  WalletEntryBuilder? _walletEntry;
  WalletEntryBuilder get walletEntry =>
      _$this._walletEntry ??= WalletEntryBuilder();
  set walletEntry(WalletEntryBuilder? walletEntry) =>
      _$this._walletEntry = walletEntry;

  ReferralRedemptionBuilder() {
    ReferralRedemption._defaults(this);
  }

  ReferralRedemptionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _referrerName = $v.referrerName;
      _rewardCents = $v.rewardCents;
      _walletEntry = $v.walletEntry.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReferralRedemption other) {
    _$v = other as _$ReferralRedemption;
  }

  @override
  void update(void Function(ReferralRedemptionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReferralRedemption build() => _build();

  _$ReferralRedemption _build() {
    _$ReferralRedemption _$result;
    try {
      _$result = _$v ??
          _$ReferralRedemption._(
            code: BuiltValueNullFieldError.checkNotNull(
                code, r'ReferralRedemption', 'code'),
            referrerName: referrerName,
            rewardCents: BuiltValueNullFieldError.checkNotNull(
                rewardCents, r'ReferralRedemption', 'rewardCents'),
            walletEntry: walletEntry.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'walletEntry';
        walletEntry.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'ReferralRedemption', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
