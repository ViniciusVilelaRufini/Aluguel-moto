// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverCreate extends HandoverCreate {
  @override
  final HandoverType type;
  @override
  final String? depotId;
  @override
  final String? pickupCode;
  @override
  final String? rentalId;
  @override
  final BuiltList<HandoverChecklistItem> checklist;
  @override
  final BuiltList<String> photoKeys;
  @override
  final int batteryPct;
  @override
  final String? batterySerial;

  factory _$HandoverCreate([void Function(HandoverCreateBuilder)? updates]) =>
      (HandoverCreateBuilder()..update(updates))._build();

  _$HandoverCreate._(
      {required this.type,
      this.depotId,
      this.pickupCode,
      this.rentalId,
      required this.checklist,
      required this.photoKeys,
      required this.batteryPct,
      this.batterySerial})
      : super._();
  @override
  HandoverCreate rebuild(void Function(HandoverCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverCreateBuilder toBuilder() => HandoverCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverCreate &&
        type == other.type &&
        depotId == other.depotId &&
        pickupCode == other.pickupCode &&
        rentalId == other.rentalId &&
        checklist == other.checklist &&
        photoKeys == other.photoKeys &&
        batteryPct == other.batteryPct &&
        batterySerial == other.batterySerial;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, pickupCode.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, checklist.hashCode);
    _$hash = $jc(_$hash, photoKeys.hashCode);
    _$hash = $jc(_$hash, batteryPct.hashCode);
    _$hash = $jc(_$hash, batterySerial.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HandoverCreate')
          ..add('type', type)
          ..add('depotId', depotId)
          ..add('pickupCode', pickupCode)
          ..add('rentalId', rentalId)
          ..add('checklist', checklist)
          ..add('photoKeys', photoKeys)
          ..add('batteryPct', batteryPct)
          ..add('batterySerial', batterySerial))
        .toString();
  }
}

class HandoverCreateBuilder
    implements Builder<HandoverCreate, HandoverCreateBuilder> {
  _$HandoverCreate? _$v;

  HandoverType? _type;
  HandoverType? get type => _$this._type;
  set type(HandoverType? type) => _$this._type = type;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  String? _pickupCode;
  String? get pickupCode => _$this._pickupCode;
  set pickupCode(String? pickupCode) => _$this._pickupCode = pickupCode;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  ListBuilder<HandoverChecklistItem>? _checklist;
  ListBuilder<HandoverChecklistItem> get checklist =>
      _$this._checklist ??= ListBuilder<HandoverChecklistItem>();
  set checklist(ListBuilder<HandoverChecklistItem>? checklist) =>
      _$this._checklist = checklist;

  ListBuilder<String>? _photoKeys;
  ListBuilder<String> get photoKeys =>
      _$this._photoKeys ??= ListBuilder<String>();
  set photoKeys(ListBuilder<String>? photoKeys) =>
      _$this._photoKeys = photoKeys;

  int? _batteryPct;
  int? get batteryPct => _$this._batteryPct;
  set batteryPct(int? batteryPct) => _$this._batteryPct = batteryPct;

  String? _batterySerial;
  String? get batterySerial => _$this._batterySerial;
  set batterySerial(String? batterySerial) =>
      _$this._batterySerial = batterySerial;

  HandoverCreateBuilder() {
    HandoverCreate._defaults(this);
  }

  HandoverCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _depotId = $v.depotId;
      _pickupCode = $v.pickupCode;
      _rentalId = $v.rentalId;
      _checklist = $v.checklist.toBuilder();
      _photoKeys = $v.photoKeys.toBuilder();
      _batteryPct = $v.batteryPct;
      _batterySerial = $v.batterySerial;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverCreate other) {
    _$v = other as _$HandoverCreate;
  }

  @override
  void update(void Function(HandoverCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverCreate build() => _build();

  _$HandoverCreate _build() {
    _$HandoverCreate _$result;
    try {
      _$result = _$v ??
          _$HandoverCreate._(
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'HandoverCreate', 'type'),
            depotId: depotId,
            pickupCode: pickupCode,
            rentalId: rentalId,
            checklist: checklist.build(),
            photoKeys: photoKeys.build(),
            batteryPct: BuiltValueNullFieldError.checkNotNull(
                batteryPct, r'HandoverCreate', 'batteryPct'),
            batterySerial: batterySerial,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'checklist';
        checklist.build();
        _$failedField = 'photoKeys';
        photoKeys.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'HandoverCreate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
