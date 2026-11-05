// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_tracker_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateTrackerRequest extends CreateTrackerRequest {
  @override
  final String imei;
  @override
  final TrackerModel model;
  @override
  final String? simCardId;

  factory _$CreateTrackerRequest(
          [void Function(CreateTrackerRequestBuilder)? updates]) =>
      (CreateTrackerRequestBuilder()..update(updates))._build();

  _$CreateTrackerRequest._(
      {required this.imei, required this.model, this.simCardId})
      : super._();
  @override
  CreateTrackerRequest rebuild(
          void Function(CreateTrackerRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateTrackerRequestBuilder toBuilder() =>
      CreateTrackerRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateTrackerRequest &&
        imei == other.imei &&
        model == other.model &&
        simCardId == other.simCardId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, imei.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, simCardId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreateTrackerRequest')
          ..add('imei', imei)
          ..add('model', model)
          ..add('simCardId', simCardId))
        .toString();
  }
}

class CreateTrackerRequestBuilder
    implements Builder<CreateTrackerRequest, CreateTrackerRequestBuilder> {
  _$CreateTrackerRequest? _$v;

  String? _imei;
  String? get imei => _$this._imei;
  set imei(String? imei) => _$this._imei = imei;

  TrackerModel? _model;
  TrackerModel? get model => _$this._model;
  set model(TrackerModel? model) => _$this._model = model;

  String? _simCardId;
  String? get simCardId => _$this._simCardId;
  set simCardId(String? simCardId) => _$this._simCardId = simCardId;

  CreateTrackerRequestBuilder() {
    CreateTrackerRequest._defaults(this);
  }

  CreateTrackerRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _imei = $v.imei;
      _model = $v.model;
      _simCardId = $v.simCardId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateTrackerRequest other) {
    _$v = other as _$CreateTrackerRequest;
  }

  @override
  void update(void Function(CreateTrackerRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateTrackerRequest build() => _build();

  _$CreateTrackerRequest _build() {
    final _$result = _$v ??
        _$CreateTrackerRequest._(
          imei: BuiltValueNullFieldError.checkNotNull(
              imei, r'CreateTrackerRequest', 'imei'),
          model: BuiltValueNullFieldError.checkNotNull(
              model, r'CreateTrackerRequest', 'model'),
          simCardId: simCardId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
