// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$IncidentPage extends IncidentPage {
  @override
  final BuiltList<Incident> items;
  @override
  final String? nextCursor;

  factory _$IncidentPage([void Function(IncidentPageBuilder)? updates]) =>
      (IncidentPageBuilder()..update(updates))._build();

  _$IncidentPage._({required this.items, this.nextCursor}) : super._();
  @override
  IncidentPage rebuild(void Function(IncidentPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  IncidentPageBuilder toBuilder() => IncidentPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is IncidentPage &&
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
    return (newBuiltValueToStringHelper(r'IncidentPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class IncidentPageBuilder
    implements Builder<IncidentPage, IncidentPageBuilder> {
  _$IncidentPage? _$v;

  ListBuilder<Incident>? _items;
  ListBuilder<Incident> get items => _$this._items ??= ListBuilder<Incident>();
  set items(ListBuilder<Incident>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  IncidentPageBuilder() {
    IncidentPage._defaults(this);
  }

  IncidentPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(IncidentPage other) {
    _$v = other as _$IncidentPage;
  }

  @override
  void update(void Function(IncidentPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  IncidentPage build() => _build();

  _$IncidentPage _build() {
    _$IncidentPage _$result;
    try {
      _$result = _$v ??
          _$IncidentPage._(
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
            r'IncidentPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
