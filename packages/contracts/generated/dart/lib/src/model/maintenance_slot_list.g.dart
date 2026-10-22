// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_slot_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceSlotList extends MaintenanceSlotList {
  @override
  final String location;
  @override
  final BuiltList<MaintenanceSlot> items;

  factory _$MaintenanceSlotList(
          [void Function(MaintenanceSlotListBuilder)? updates]) =>
      (MaintenanceSlotListBuilder()..update(updates))._build();

  _$MaintenanceSlotList._({required this.location, required this.items})
      : super._();
  @override
  MaintenanceSlotList rebuild(
          void Function(MaintenanceSlotListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceSlotListBuilder toBuilder() =>
      MaintenanceSlotListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceSlotList &&
        location == other.location &&
        items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, location.hashCode);
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceSlotList')
          ..add('location', location)
          ..add('items', items))
        .toString();
  }
}

class MaintenanceSlotListBuilder
    implements Builder<MaintenanceSlotList, MaintenanceSlotListBuilder> {
  _$MaintenanceSlotList? _$v;

  String? _location;
  String? get location => _$this._location;
  set location(String? location) => _$this._location = location;

  ListBuilder<MaintenanceSlot>? _items;
  ListBuilder<MaintenanceSlot> get items =>
      _$this._items ??= ListBuilder<MaintenanceSlot>();
  set items(ListBuilder<MaintenanceSlot>? items) => _$this._items = items;

  MaintenanceSlotListBuilder() {
    MaintenanceSlotList._defaults(this);
  }

  MaintenanceSlotListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _location = $v.location;
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceSlotList other) {
    _$v = other as _$MaintenanceSlotList;
  }

  @override
  void update(void Function(MaintenanceSlotListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceSlotList build() => _build();

  _$MaintenanceSlotList _build() {
    _$MaintenanceSlotList _$result;
    try {
      _$result = _$v ??
          _$MaintenanceSlotList._(
            location: BuiltValueNullFieldError.checkNotNull(
                location, r'MaintenanceSlotList', 'location'),
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'MaintenanceSlotList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
