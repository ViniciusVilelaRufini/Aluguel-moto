// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Dispute extends Dispute {
  @override
  final String id;
  @override
  final String customerId;
  @override
  final String rentalId;
  @override
  final String? paymentId;
  @override
  final DisputeStatus status;
  @override
  final String reason;
  @override
  final String? description;
  @override
  final String? resolution;
  @override
  final int? refundAmountCents;
  @override
  final String? resolvedById;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;
  @override
  final DateTime? resolvedAt;

  factory _$Dispute([void Function(DisputeBuilder)? updates]) =>
      (DisputeBuilder()..update(updates))._build();

  _$Dispute._(
      {required this.id,
      required this.customerId,
      required this.rentalId,
      this.paymentId,
      required this.status,
      required this.reason,
      this.description,
      this.resolution,
      this.refundAmountCents,
      this.resolvedById,
      required this.createdAt,
      required this.updatedAt,
      this.resolvedAt})
      : super._();
  @override
  Dispute rebuild(void Function(DisputeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DisputeBuilder toBuilder() => DisputeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Dispute &&
        id == other.id &&
        customerId == other.customerId &&
        rentalId == other.rentalId &&
        paymentId == other.paymentId &&
        status == other.status &&
        reason == other.reason &&
        description == other.description &&
        resolution == other.resolution &&
        refundAmountCents == other.refundAmountCents &&
        resolvedById == other.resolvedById &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt &&
        resolvedAt == other.resolvedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, resolution.hashCode);
    _$hash = $jc(_$hash, refundAmountCents.hashCode);
    _$hash = $jc(_$hash, resolvedById.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jc(_$hash, resolvedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Dispute')
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('rentalId', rentalId)
          ..add('paymentId', paymentId)
          ..add('status', status)
          ..add('reason', reason)
          ..add('description', description)
          ..add('resolution', resolution)
          ..add('refundAmountCents', refundAmountCents)
          ..add('resolvedById', resolvedById)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt)
          ..add('resolvedAt', resolvedAt))
        .toString();
  }
}

class DisputeBuilder implements Builder<Dispute, DisputeBuilder> {
  _$Dispute? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  DisputeStatus? _status;
  DisputeStatus? get status => _$this._status;
  set status(DisputeStatus? status) => _$this._status = status;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  String? _resolution;
  String? get resolution => _$this._resolution;
  set resolution(String? resolution) => _$this._resolution = resolution;

  int? _refundAmountCents;
  int? get refundAmountCents => _$this._refundAmountCents;
  set refundAmountCents(int? refundAmountCents) =>
      _$this._refundAmountCents = refundAmountCents;

  String? _resolvedById;
  String? get resolvedById => _$this._resolvedById;
  set resolvedById(String? resolvedById) => _$this._resolvedById = resolvedById;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  DateTime? _resolvedAt;
  DateTime? get resolvedAt => _$this._resolvedAt;
  set resolvedAt(DateTime? resolvedAt) => _$this._resolvedAt = resolvedAt;

  DisputeBuilder() {
    Dispute._defaults(this);
  }

  DisputeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _customerId = $v.customerId;
      _rentalId = $v.rentalId;
      _paymentId = $v.paymentId;
      _status = $v.status;
      _reason = $v.reason;
      _description = $v.description;
      _resolution = $v.resolution;
      _refundAmountCents = $v.refundAmountCents;
      _resolvedById = $v.resolvedById;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _resolvedAt = $v.resolvedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Dispute other) {
    _$v = other as _$Dispute;
  }

  @override
  void update(void Function(DisputeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Dispute build() => _build();

  _$Dispute _build() {
    final _$result = _$v ??
        _$Dispute._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Dispute', 'id'),
          customerId: BuiltValueNullFieldError.checkNotNull(
              customerId, r'Dispute', 'customerId'),
          rentalId: BuiltValueNullFieldError.checkNotNull(
              rentalId, r'Dispute', 'rentalId'),
          paymentId: paymentId,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'Dispute', 'status'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'Dispute', 'reason'),
          description: description,
          resolution: resolution,
          refundAmountCents: refundAmountCents,
          resolvedById: resolvedById,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'Dispute', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'Dispute', 'updatedAt'),
          resolvedAt: resolvedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
