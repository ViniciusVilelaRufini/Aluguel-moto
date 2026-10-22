// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReferralSummary extends ReferralSummary {
  @override
  final String code;
  @override
  final String inviteUrl;
  @override
  final String shareMessage;
  @override
  final int referrerRewardCents;
  @override
  final int refereeRewardCents;
  @override
  final int invitedCount;
  @override
  final int qualifiedCount;
  @override
  final int totalEarnedCents;
  @override
  final String? referredBy;

  factory _$ReferralSummary([void Function(ReferralSummaryBuilder)? updates]) =>
      (ReferralSummaryBuilder()..update(updates))._build();

  _$ReferralSummary._(
      {required this.code,
      required this.inviteUrl,
      required this.shareMessage,
      required this.referrerRewardCents,
      required this.refereeRewardCents,
      required this.invitedCount,
      required this.qualifiedCount,
      required this.totalEarnedCents,
      this.referredBy})
      : super._();
  @override
  ReferralSummary rebuild(void Function(ReferralSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReferralSummaryBuilder toBuilder() => ReferralSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReferralSummary &&
        code == other.code &&
        inviteUrl == other.inviteUrl &&
        shareMessage == other.shareMessage &&
        referrerRewardCents == other.referrerRewardCents &&
        refereeRewardCents == other.refereeRewardCents &&
        invitedCount == other.invitedCount &&
        qualifiedCount == other.qualifiedCount &&
        totalEarnedCents == other.totalEarnedCents &&
        referredBy == other.referredBy;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, inviteUrl.hashCode);
    _$hash = $jc(_$hash, shareMessage.hashCode);
    _$hash = $jc(_$hash, referrerRewardCents.hashCode);
    _$hash = $jc(_$hash, refereeRewardCents.hashCode);
    _$hash = $jc(_$hash, invitedCount.hashCode);
    _$hash = $jc(_$hash, qualifiedCount.hashCode);
    _$hash = $jc(_$hash, totalEarnedCents.hashCode);
    _$hash = $jc(_$hash, referredBy.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReferralSummary')
          ..add('code', code)
          ..add('inviteUrl', inviteUrl)
          ..add('shareMessage', shareMessage)
          ..add('referrerRewardCents', referrerRewardCents)
          ..add('refereeRewardCents', refereeRewardCents)
          ..add('invitedCount', invitedCount)
          ..add('qualifiedCount', qualifiedCount)
          ..add('totalEarnedCents', totalEarnedCents)
          ..add('referredBy', referredBy))
        .toString();
  }
}

class ReferralSummaryBuilder
    implements Builder<ReferralSummary, ReferralSummaryBuilder> {
  _$ReferralSummary? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _inviteUrl;
  String? get inviteUrl => _$this._inviteUrl;
  set inviteUrl(String? inviteUrl) => _$this._inviteUrl = inviteUrl;

  String? _shareMessage;
  String? get shareMessage => _$this._shareMessage;
  set shareMessage(String? shareMessage) => _$this._shareMessage = shareMessage;

  int? _referrerRewardCents;
  int? get referrerRewardCents => _$this._referrerRewardCents;
  set referrerRewardCents(int? referrerRewardCents) =>
      _$this._referrerRewardCents = referrerRewardCents;

  int? _refereeRewardCents;
  int? get refereeRewardCents => _$this._refereeRewardCents;
  set refereeRewardCents(int? refereeRewardCents) =>
      _$this._refereeRewardCents = refereeRewardCents;

  int? _invitedCount;
  int? get invitedCount => _$this._invitedCount;
  set invitedCount(int? invitedCount) => _$this._invitedCount = invitedCount;

  int? _qualifiedCount;
  int? get qualifiedCount => _$this._qualifiedCount;
  set qualifiedCount(int? qualifiedCount) =>
      _$this._qualifiedCount = qualifiedCount;

  int? _totalEarnedCents;
  int? get totalEarnedCents => _$this._totalEarnedCents;
  set totalEarnedCents(int? totalEarnedCents) =>
      _$this._totalEarnedCents = totalEarnedCents;

  String? _referredBy;
  String? get referredBy => _$this._referredBy;
  set referredBy(String? referredBy) => _$this._referredBy = referredBy;

  ReferralSummaryBuilder() {
    ReferralSummary._defaults(this);
  }

  ReferralSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _inviteUrl = $v.inviteUrl;
      _shareMessage = $v.shareMessage;
      _referrerRewardCents = $v.referrerRewardCents;
      _refereeRewardCents = $v.refereeRewardCents;
      _invitedCount = $v.invitedCount;
      _qualifiedCount = $v.qualifiedCount;
      _totalEarnedCents = $v.totalEarnedCents;
      _referredBy = $v.referredBy;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReferralSummary other) {
    _$v = other as _$ReferralSummary;
  }

  @override
  void update(void Function(ReferralSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReferralSummary build() => _build();

  _$ReferralSummary _build() {
    final _$result = _$v ??
        _$ReferralSummary._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'ReferralSummary', 'code'),
          inviteUrl: BuiltValueNullFieldError.checkNotNull(
              inviteUrl, r'ReferralSummary', 'inviteUrl'),
          shareMessage: BuiltValueNullFieldError.checkNotNull(
              shareMessage, r'ReferralSummary', 'shareMessage'),
          referrerRewardCents: BuiltValueNullFieldError.checkNotNull(
              referrerRewardCents, r'ReferralSummary', 'referrerRewardCents'),
          refereeRewardCents: BuiltValueNullFieldError.checkNotNull(
              refereeRewardCents, r'ReferralSummary', 'refereeRewardCents'),
          invitedCount: BuiltValueNullFieldError.checkNotNull(
              invitedCount, r'ReferralSummary', 'invitedCount'),
          qualifiedCount: BuiltValueNullFieldError.checkNotNull(
              qualifiedCount, r'ReferralSummary', 'qualifiedCount'),
          totalEarnedCents: BuiltValueNullFieldError.checkNotNull(
              totalEarnedCents, r'ReferralSummary', 'totalEarnedCents'),
          referredBy: referredBy,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
