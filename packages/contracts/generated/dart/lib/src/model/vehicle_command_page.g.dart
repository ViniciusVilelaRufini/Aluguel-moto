// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_command_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleCommandPage extends VehicleCommandPage {
  @override
  final BuiltList<VehicleCommand> items;
  @override
  final String? nextCursor;

  factory _$VehicleCommandPage(
          [void Function(VehicleCommandPageBuilder)? updates]) =>
      (VehicleCommandPageBuilder()..update(updates))._build();

  _$VehicleCommandPage._({required this.items, this.nextCursor}) : super._();
  @override
  VehicleCommandPage rebuild(
          void Function(VehicleCommandPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleCommandPageBuilder toBuilder() =>
      VehicleCommandPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleCommandPage &&
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
    return (newBuiltValueToStringHelper(r'VehicleCommandPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class VehicleCommandPageBuilder
    implements Builder<VehicleCommandPage, VehicleCommandPageBuilder> {
  _$VehicleCommandPage? _$v;

  ListBuilder<VehicleCommand>? _items;
  ListBuilder<VehicleCommand> get items =>
      _$this._items ??= ListBuilder<VehicleCommand>();
  set items(ListBuilder<VehicleCommand>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  VehicleCommandPageBuilder() {
    VehicleCommandPage._defaults(this);
  }

  VehicleCommandPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleCommandPage other) {
    _$v = other as _$VehicleCommandPage;
  }

  @override
  void update(void Function(VehicleCommandPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleCommandPage build() => _build();

  _$VehicleCommandPage _build() {
    _$VehicleCommandPage _$result;
    try {
      _$result = _$v ??
          _$VehicleCommandPage._(
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
            r'VehicleCommandPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
