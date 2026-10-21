// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_entry.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$WalletEntry extends WalletEntry {
  @override
  final String id;
  @override
  final WalletEntryType type;
  @override
  final int amountCents;
  @override
  final int? minutes;
  @override
  final int balanceAfterCents;
  @override
  final String description;
  @override
  final String? rentalId;
  @override
  final String? paymentId;
  @override
  final String? createdById;
  @override
  final DateTime createdAt;

  factory _$WalletEntry([void Function(WalletEntryBuilder)? updates]) =>
      (WalletEntryBuilder()..update(updates))._build();

  _$WalletEntry._(
      {required this.id,
      required this.type,
      required this.amountCents,
      this.minutes,
      required this.balanceAfterCents,
      required this.description,
      this.rentalId,
      this.paymentId,
      this.createdById,
      required this.createdAt})
      : super._();
  @override
  WalletEntry rebuild(void Function(WalletEntryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  WalletEntryBuilder toBuilder() => WalletEntryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is WalletEntry &&
        id == other.id &&
        type == other.type &&
        amountCents == other.amountCents &&
        minutes == other.minutes &&
        balanceAfterCents == other.balanceAfterCents &&
        description == other.description &&
        rentalId == other.rentalId &&
        paymentId == other.paymentId &&
        createdById == other.createdById &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, minutes.hashCode);
    _$hash = $jc(_$hash, balanceAfterCents.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, createdById.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'WalletEntry')
          ..add('id', id)
          ..add('type', type)
          ..add('amountCents', amountCents)
          ..add('minutes', minutes)
          ..add('balanceAfterCents', balanceAfterCents)
          ..add('description', description)
          ..add('rentalId', rentalId)
          ..add('paymentId', paymentId)
          ..add('createdById', createdById)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class WalletEntryBuilder implements Builder<WalletEntry, WalletEntryBuilder> {
  _$WalletEntry? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  WalletEntryType? _type;
  WalletEntryType? get type => _$this._type;
  set type(WalletEntryType? type) => _$this._type = type;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  int? _minutes;
  int? get minutes => _$this._minutes;
  set minutes(int? minutes) => _$this._minutes = minutes;

  int? _balanceAfterCents;
  int? get balanceAfterCents => _$this._balanceAfterCents;
  set balanceAfterCents(int? balanceAfterCents) =>
      _$this._balanceAfterCents = balanceAfterCents;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  String? _createdById;
  String? get createdById => _$this._createdById;
  set createdById(String? createdById) => _$this._createdById = createdById;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  WalletEntryBuilder() {
    WalletEntry._defaults(this);
  }

  WalletEntryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _amountCents = $v.amountCents;
      _minutes = $v.minutes;
      _balanceAfterCents = $v.balanceAfterCents;
      _description = $v.description;
      _rentalId = $v.rentalId;
      _paymentId = $v.paymentId;
      _createdById = $v.createdById;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(WalletEntry other) {
    _$v = other as _$WalletEntry;
  }

  @override
  void update(void Function(WalletEntryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  WalletEntry build() => _build();

  _$WalletEntry _build() {
    final _$result = _$v ??
        _$WalletEntry._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'WalletEntry', 'id'),
          type: BuiltValueNullFieldError.checkNotNull(
              type, r'WalletEntry', 'type'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'WalletEntry', 'amountCents'),
          minutes: minutes,
          balanceAfterCents: BuiltValueNullFieldError.checkNotNull(
              balanceAfterCents, r'WalletEntry', 'balanceAfterCents'),
          description: BuiltValueNullFieldError.checkNotNull(
              description, r'WalletEntry', 'description'),
          rentalId: rentalId,
          paymentId: paymentId,
          createdById: createdById,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'WalletEntry', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
