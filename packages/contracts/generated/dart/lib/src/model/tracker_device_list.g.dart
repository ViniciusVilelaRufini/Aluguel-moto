// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_device_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackerDeviceList extends TrackerDeviceList {
  @override
  final BuiltList<TrackerDevice> items;

  factory _$TrackerDeviceList(
          [void Function(TrackerDeviceListBuilder)? updates]) =>
      (TrackerDeviceListBuilder()..update(updates))._build();

  _$TrackerDeviceList._({required this.items}) : super._();
  @override
  TrackerDeviceList rebuild(void Function(TrackerDeviceListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackerDeviceListBuilder toBuilder() =>
      TrackerDeviceListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackerDeviceList && items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackerDeviceList')
          ..add('items', items))
        .toString();
  }
}

class TrackerDeviceListBuilder
    implements Builder<TrackerDeviceList, TrackerDeviceListBuilder> {
  _$TrackerDeviceList? _$v;

  ListBuilder<TrackerDevice>? _items;
  ListBuilder<TrackerDevice> get items =>
      _$this._items ??= ListBuilder<TrackerDevice>();
  set items(ListBuilder<TrackerDevice>? items) => _$this._items = items;

  TrackerDeviceListBuilder() {
    TrackerDeviceList._defaults(this);
  }

  TrackerDeviceListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackerDeviceList other) {
    _$v = other as _$TrackerDeviceList;
  }

  @override
  void update(void Function(TrackerDeviceListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackerDeviceList build() => _build();

  _$TrackerDeviceList _build() {
    _$TrackerDeviceList _$result;
    try {
      _$result = _$v ??
          _$TrackerDeviceList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'TrackerDeviceList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
