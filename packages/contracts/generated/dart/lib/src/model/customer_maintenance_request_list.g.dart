// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_maintenance_request_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerMaintenanceRequestList extends CustomerMaintenanceRequestList {
  @override
  final BuiltList<CustomerMaintenanceRequest> items;

  factory _$CustomerMaintenanceRequestList(
          [void Function(CustomerMaintenanceRequestListBuilder)? updates]) =>
      (CustomerMaintenanceRequestListBuilder()..update(updates))._build();

  _$CustomerMaintenanceRequestList._({required this.items}) : super._();
  @override
  CustomerMaintenanceRequestList rebuild(
          void Function(CustomerMaintenanceRequestListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerMaintenanceRequestListBuilder toBuilder() =>
      CustomerMaintenanceRequestListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerMaintenanceRequestList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'CustomerMaintenanceRequestList')
          ..add('items', items))
        .toString();
  }
}

class CustomerMaintenanceRequestListBuilder
    implements
        Builder<CustomerMaintenanceRequestList,
            CustomerMaintenanceRequestListBuilder> {
  _$CustomerMaintenanceRequestList? _$v;

  ListBuilder<CustomerMaintenanceRequest>? _items;
  ListBuilder<CustomerMaintenanceRequest> get items =>
      _$this._items ??= ListBuilder<CustomerMaintenanceRequest>();
  set items(ListBuilder<CustomerMaintenanceRequest>? items) =>
      _$this._items = items;

  CustomerMaintenanceRequestListBuilder() {
    CustomerMaintenanceRequestList._defaults(this);
  }

  CustomerMaintenanceRequestListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerMaintenanceRequestList other) {
    _$v = other as _$CustomerMaintenanceRequestList;
  }

  @override
  void update(void Function(CustomerMaintenanceRequestListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerMaintenanceRequestList build() => _build();

  _$CustomerMaintenanceRequestList _build() {
    _$CustomerMaintenanceRequestList _$result;
    try {
      _$result = _$v ??
          _$CustomerMaintenanceRequestList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CustomerMaintenanceRequestList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
