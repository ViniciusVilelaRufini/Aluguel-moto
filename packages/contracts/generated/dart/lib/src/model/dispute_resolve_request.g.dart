// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute_resolve_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DisputeResolveRequest extends DisputeResolveRequest {
  @override
  final DisputeDecision decision;
  @override
  final String resolution;
  @override
  final int? refundAmountCents;

  factory _$DisputeResolveRequest(
          [void Function(DisputeResolveRequestBuilder)? updates]) =>
      (DisputeResolveRequestBuilder()..update(updates))._build();

  _$DisputeResolveRequest._(
      {required this.decision,
      required this.resolution,
      this.refundAmountCents})
      : super._();
  @override
  DisputeResolveRequest rebuild(
          void Function(DisputeResolveRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DisputeResolveRequestBuilder toBuilder() =>
      DisputeResolveRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DisputeResolveRequest &&
        decision == other.decision &&
        resolution == other.resolution &&
        refundAmountCents == other.refundAmountCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, decision.hashCode);
    _$hash = $jc(_$hash, resolution.hashCode);
    _$hash = $jc(_$hash, refundAmountCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DisputeResolveRequest')
          ..add('decision', decision)
          ..add('resolution', resolution)
          ..add('refundAmountCents', refundAmountCents))
        .toString();
  }
}

class DisputeResolveRequestBuilder
    implements Builder<DisputeResolveRequest, DisputeResolveRequestBuilder> {
  _$DisputeResolveRequest? _$v;

  DisputeDecision? _decision;
  DisputeDecision? get decision => _$this._decision;
  set decision(DisputeDecision? decision) => _$this._decision = decision;

  String? _resolution;
  String? get resolution => _$this._resolution;
  set resolution(String? resolution) => _$this._resolution = resolution;

  int? _refundAmountCents;
  int? get refundAmountCents => _$this._refundAmountCents;
  set refundAmountCents(int? refundAmountCents) =>
      _$this._refundAmountCents = refundAmountCents;

  DisputeResolveRequestBuilder() {
    DisputeResolveRequest._defaults(this);
  }

  DisputeResolveRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _decision = $v.decision;
      _resolution = $v.resolution;
      _refundAmountCents = $v.refundAmountCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DisputeResolveRequest other) {
    _$v = other as _$DisputeResolveRequest;
  }

  @override
  void update(void Function(DisputeResolveRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DisputeResolveRequest build() => _build();

  _$DisputeResolveRequest _build() {
    final _$result = _$v ??
        _$DisputeResolveRequest._(
          decision: BuiltValueNullFieldError.checkNotNull(
              decision, r'DisputeResolveRequest', 'decision'),
          resolution: BuiltValueNullFieldError.checkNotNull(
              resolution, r'DisputeResolveRequest', 'resolution'),
          refundAmountCents: refundAmountCents,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
