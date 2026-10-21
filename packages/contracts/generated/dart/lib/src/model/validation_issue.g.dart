// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'validation_issue.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ValidationIssue extends ValidationIssue {
  @override
  final String field;
  @override
  final String message;

  factory _$ValidationIssue([void Function(ValidationIssueBuilder)? updates]) =>
      (ValidationIssueBuilder()..update(updates))._build();

  _$ValidationIssue._({required this.field, required this.message}) : super._();
  @override
  ValidationIssue rebuild(void Function(ValidationIssueBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ValidationIssueBuilder toBuilder() => ValidationIssueBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ValidationIssue &&
        field == other.field &&
        message == other.message;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, field.hashCode);
    _$hash = $jc(_$hash, message.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ValidationIssue')
          ..add('field', field)
          ..add('message', message))
        .toString();
  }
}

class ValidationIssueBuilder
    implements Builder<ValidationIssue, ValidationIssueBuilder> {
  _$ValidationIssue? _$v;

  String? _field;
  String? get field => _$this._field;
  set field(String? field) => _$this._field = field;

  String? _message;
  String? get message => _$this._message;
  set message(String? message) => _$this._message = message;

  ValidationIssueBuilder() {
    ValidationIssue._defaults(this);
  }

  ValidationIssueBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _field = $v.field;
      _message = $v.message;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ValidationIssue other) {
    _$v = other as _$ValidationIssue;
  }

  @override
  void update(void Function(ValidationIssueBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ValidationIssue build() => _build();

  _$ValidationIssue _build() {
    final _$result = _$v ??
        _$ValidationIssue._(
          field: BuiltValueNullFieldError.checkNotNull(
              field, r'ValidationIssue', 'field'),
          message: BuiltValueNullFieldError.checkNotNull(
              message, r'ValidationIssue', 'message'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
