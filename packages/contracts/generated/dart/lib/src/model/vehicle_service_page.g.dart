// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_service_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleServicePage extends VehicleServicePage {
  @override
  final BuiltList<VehicleServiceRow> items;
  @override
  final String? nextCursor;

  factory _$VehicleServicePage(
          [void Function(VehicleServicePageBuilder)? updates]) =>
      (VehicleServicePageBuilder()..update(updates))._build();

  _$VehicleServicePage._({required this.items, this.nextCursor}) : super._();
  @override
  VehicleServicePage rebuild(
          void Function(VehicleServicePageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleServicePageBuilder toBuilder() =>
      VehicleServicePageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleServicePage &&
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
    return (newBuiltValueToStringHelper(r'VehicleServicePage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class VehicleServicePageBuilder
    implements Builder<VehicleServicePage, VehicleServicePageBuilder> {
  _$VehicleServicePage? _$v;

  ListBuilder<VehicleServiceRow>? _items;
  ListBuilder<VehicleServiceRow> get items =>
      _$this._items ??= ListBuilder<VehicleServiceRow>();
  set items(ListBuilder<VehicleServiceRow>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  VehicleServicePageBuilder() {
    VehicleServicePage._defaults(this);
  }

  VehicleServicePageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleServicePage other) {
    _$v = other as _$VehicleServicePage;
  }

  @override
  void update(void Function(VehicleServicePageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleServicePage build() => _build();

  _$VehicleServicePage _build() {
    _$VehicleServicePage _$result;
    try {
      _$result = _$v ??
          _$VehicleServicePage._(
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
            r'VehicleServicePage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
