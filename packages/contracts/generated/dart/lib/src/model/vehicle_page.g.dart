// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehiclePage extends VehiclePage {
  @override
  final BuiltList<Vehicle> items;
  @override
  final String? nextCursor;

  factory _$VehiclePage([void Function(VehiclePageBuilder)? updates]) =>
      (VehiclePageBuilder()..update(updates))._build();

  _$VehiclePage._({required this.items, this.nextCursor}) : super._();
  @override
  VehiclePage rebuild(void Function(VehiclePageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehiclePageBuilder toBuilder() => VehiclePageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehiclePage &&
        items == other.items &&
        nextCursor == other.nextCursor;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehiclePage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class VehiclePageBuilder implements Builder<VehiclePage, VehiclePageBuilder> {
  _$VehiclePage? _$v;

  ListBuilder<Vehicle>? _items;
  ListBuilder<Vehicle> get items => _$this._items ??= ListBuilder<Vehicle>();
  set items(ListBuilder<Vehicle>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  VehiclePageBuilder() {
    VehiclePage._defaults(this);
  }

  VehiclePageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehiclePage other) {
    _$v = other as _$VehiclePage;
  }

  @override
  void update(void Function(VehiclePageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehiclePage build() => _build();

  _$VehiclePage _build() {
    _$VehiclePage _$result;
    try {
      _$result = _$v ??
          _$VehiclePage._(
            items: items.build(),
            nextCursor: nextCursor,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'VehiclePage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
