// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_maintenance_request_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerMaintenanceRequestCreate
    extends CustomerMaintenanceRequestCreate {
  @override
  final DateTime slotStartsAt;
  @override
  final String description;

  factory _$CustomerMaintenanceRequestCreate(
          [void Function(CustomerMaintenanceRequestCreateBuilder)? updates]) =>
      (CustomerMaintenanceRequestCreateBuilder()..update(updates))._build();

  _$CustomerMaintenanceRequestCreate._(
      {required this.slotStartsAt, required this.description})
      : super._();
  @override
  CustomerMaintenanceRequestCreate rebuild(
          void Function(CustomerMaintenanceRequestCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerMaintenanceRequestCreateBuilder toBuilder() =>
      CustomerMaintenanceRequestCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerMaintenanceRequestCreate &&
        slotStartsAt == other.slotStartsAt &&
        description == other.description;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, slotStartsAt.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerMaintenanceRequestCreate')
          ..add('slotStartsAt', slotStartsAt)
          ..add('description', description))
        .toString();
  }
}

class CustomerMaintenanceRequestCreateBuilder
    implements
        Builder<CustomerMaintenanceRequestCreate,
            CustomerMaintenanceRequestCreateBuilder> {
  _$CustomerMaintenanceRequestCreate? _$v;

  DateTime? _slotStartsAt;
  DateTime? get slotStartsAt => _$this._slotStartsAt;
  set slotStartsAt(DateTime? slotStartsAt) =>
      _$this._slotStartsAt = slotStartsAt;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  CustomerMaintenanceRequestCreateBuilder() {
    CustomerMaintenanceRequestCreate._defaults(this);
  }

  CustomerMaintenanceRequestCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _slotStartsAt = $v.slotStartsAt;
      _description = $v.description;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerMaintenanceRequestCreate other) {
    _$v = other as _$CustomerMaintenanceRequestCreate;
  }

  @override
  void update(void Function(CustomerMaintenanceRequestCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerMaintenanceRequestCreate build() => _build();

  _$CustomerMaintenanceRequestCreate _build() {
    final _$result = _$v ??
        _$CustomerMaintenanceRequestCreate._(
          slotStartsAt: BuiltValueNullFieldError.checkNotNull(slotStartsAt,
              r'CustomerMaintenanceRequestCreate', 'slotStartsAt'),
          description: BuiltValueNullFieldError.checkNotNull(
              description, r'CustomerMaintenanceRequestCreate', 'description'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
