// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverPage extends HandoverPage {
  @override
  final BuiltList<Handover> items;
  @override
  final String? nextCursor;

  factory _$HandoverPage([void Function(HandoverPageBuilder)? updates]) =>
      (HandoverPageBuilder()..update(updates))._build();

  _$HandoverPage._({required this.items, this.nextCursor}) : super._();
  @override
  HandoverPage rebuild(void Function(HandoverPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverPageBuilder toBuilder() => HandoverPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverPage &&
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
    return (newBuiltValueToStringHelper(r'HandoverPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class HandoverPageBuilder
    implements Builder<HandoverPage, HandoverPageBuilder> {
  _$HandoverPage? _$v;

  ListBuilder<Handover>? _items;
  ListBuilder<Handover> get items => _$this._items ??= ListBuilder<Handover>();
  set items(ListBuilder<Handover>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  HandoverPageBuilder() {
    HandoverPage._defaults(this);
  }

  HandoverPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverPage other) {
    _$v = other as _$HandoverPage;
  }

  @override
  void update(void Function(HandoverPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverPage build() => _build();

  _$HandoverPage _build() {
    _$HandoverPage _$result;
    try {
      _$result = _$v ??
          _$HandoverPage._(
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
            r'HandoverPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
