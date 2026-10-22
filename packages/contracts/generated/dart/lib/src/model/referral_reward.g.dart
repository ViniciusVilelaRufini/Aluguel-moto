// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_reward.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReferralReward extends ReferralReward {
  @override
  final String id;
  @override
  final String refereeName;
  @override
  final ReferralRewardStatus status;
  @override
  final int amountCents;
  @override
  final String? walletEntryId;
  @override
  final DateTime createdAt;
  @override
  final DateTime? grantedAt;

  factory _$ReferralReward([void Function(ReferralRewardBuilder)? updates]) =>
      (ReferralRewardBuilder()..update(updates))._build();

  _$ReferralReward._(
      {required this.id,
      required this.refereeName,
      required this.status,
      required this.amountCents,
      this.walletEntryId,
      required this.createdAt,
      this.grantedAt})
      : super._();
  @override
  ReferralReward rebuild(void Function(ReferralRewardBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReferralRewardBuilder toBuilder() => ReferralRewardBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReferralReward &&
        id == other.id &&
        refereeName == other.refereeName &&
        status == other.status &&
        amountCents == other.amountCents &&
        walletEntryId == other.walletEntryId &&
        createdAt == other.createdAt &&
        grantedAt == other.grantedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, refereeName.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, walletEntryId.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, grantedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReferralReward')
          ..add('id', id)
          ..add('refereeName', refereeName)
          ..add('status', status)
          ..add('amountCents', amountCents)
          ..add('walletEntryId', walletEntryId)
          ..add('createdAt', createdAt)
          ..add('grantedAt', grantedAt))
        .toString();
  }
}

class ReferralRewardBuilder
    implements Builder<ReferralReward, ReferralRewardBuilder> {
  _$ReferralReward? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _refereeName;
  String? get refereeName => _$this._refereeName;
  set refereeName(String? refereeName) => _$this._refereeName = refereeName;

  ReferralRewardStatus? _status;
  ReferralRewardStatus? get status => _$this._status;
  set status(ReferralRewardStatus? status) => _$this._status = status;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _walletEntryId;
  String? get walletEntryId => _$this._walletEntryId;
  set walletEntryId(String? walletEntryId) =>
      _$this._walletEntryId = walletEntryId;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _grantedAt;
  DateTime? get grantedAt => _$this._grantedAt;
  set grantedAt(DateTime? grantedAt) => _$this._grantedAt = grantedAt;

  ReferralRewardBuilder() {
    ReferralReward._defaults(this);
  }

  ReferralRewardBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _refereeName = $v.refereeName;
      _status = $v.status;
      _amountCents = $v.amountCents;
      _walletEntryId = $v.walletEntryId;
      _createdAt = $v.createdAt;
      _grantedAt = $v.grantedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReferralReward other) {
    _$v = other as _$ReferralReward;
  }

  @override
  void update(void Function(ReferralRewardBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReferralReward build() => _build();

  _$ReferralReward _build() {
    final _$result = _$v ??
        _$ReferralReward._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'ReferralReward', 'id'),
          refereeName: BuiltValueNullFieldError.checkNotNull(
              refereeName, r'ReferralReward', 'refereeName'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'ReferralReward', 'status'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'ReferralReward', 'amountCents'),
          walletEntryId: walletEntryId,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'ReferralReward', 'createdAt'),
          grantedAt: grantedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
