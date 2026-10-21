// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_message_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportMessagePage extends SupportMessagePage {
  @override
  final BuiltList<SupportMessage> items;
  @override
  final String? nextCursor;

  factory _$SupportMessagePage(
          [void Function(SupportMessagePageBuilder)? updates]) =>
      (SupportMessagePageBuilder()..update(updates))._build();

  _$SupportMessagePage._({required this.items, this.nextCursor}) : super._();
  @override
  SupportMessagePage rebuild(
          void Function(SupportMessagePageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportMessagePageBuilder toBuilder() =>
      SupportMessagePageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportMessagePage &&
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
    return (newBuiltValueToStringHelper(r'SupportMessagePage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class SupportMessagePageBuilder
    implements Builder<SupportMessagePage, SupportMessagePageBuilder> {
  _$SupportMessagePage? _$v;

  ListBuilder<SupportMessage>? _items;
  ListBuilder<SupportMessage> get items =>
      _$this._items ??= ListBuilder<SupportMessage>();
  set items(ListBuilder<SupportMessage>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  SupportMessagePageBuilder() {
    SupportMessagePage._defaults(this);
  }

  SupportMessagePageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportMessagePage other) {
    _$v = other as _$SupportMessagePage;
  }

  @override
  void update(void Function(SupportMessagePageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportMessagePage build() => _build();

  _$SupportMessagePage _build() {
    _$SupportMessagePage _$result;
    try {
      _$result = _$v ??
          _$SupportMessagePage._(
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
            r'SupportMessagePage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
