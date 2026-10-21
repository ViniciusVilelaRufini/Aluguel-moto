// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_conversation_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportConversationPage extends SupportConversationPage {
  @override
  final BuiltList<SupportConversation> items;
  @override
  final String? nextCursor;

  factory _$SupportConversationPage(
          [void Function(SupportConversationPageBuilder)? updates]) =>
      (SupportConversationPageBuilder()..update(updates))._build();

  _$SupportConversationPage._({required this.items, this.nextCursor})
      : super._();
  @override
  SupportConversationPage rebuild(
          void Function(SupportConversationPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportConversationPageBuilder toBuilder() =>
      SupportConversationPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportConversationPage &&
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
    return (newBuiltValueToStringHelper(r'SupportConversationPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class SupportConversationPageBuilder
    implements
        Builder<SupportConversationPage, SupportConversationPageBuilder> {
  _$SupportConversationPage? _$v;

  ListBuilder<SupportConversation>? _items;
  ListBuilder<SupportConversation> get items =>
      _$this._items ??= ListBuilder<SupportConversation>();
  set items(ListBuilder<SupportConversation>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  SupportConversationPageBuilder() {
    SupportConversationPage._defaults(this);
  }

  SupportConversationPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportConversationPage other) {
    _$v = other as _$SupportConversationPage;
  }

  @override
  void update(void Function(SupportConversationPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportConversationPage build() => _build();

  _$SupportConversationPage _build() {
    _$SupportConversationPage _$result;
    try {
      _$result = _$v ??
          _$SupportConversationPage._(
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
            r'SupportConversationPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
