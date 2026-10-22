//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'station_swap_status.g.dart';

/// `opening_slot` (estação abrindo uma vaga vazia) → `awaiting_return` (vaga aberta, devolva a bateria) → `returned` (devolvida) → `releasing` (vaga fechada, liberando a carregada) → `completed`. Finais: `completed`, `canceled`, `failed` (ver `endReason`).
class StationSwapStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'opening_slot')
  static const StationSwapStatus openingSlot = _$openingSlot;
  @BuiltValueEnumConst(wireName: r'awaiting_return')
  static const StationSwapStatus awaitingReturn = _$awaitingReturn;
  @BuiltValueEnumConst(wireName: r'returned')
  static const StationSwapStatus returned = _$returned;
  @BuiltValueEnumConst(wireName: r'releasing')
  static const StationSwapStatus releasing = _$releasing;
  @BuiltValueEnumConst(wireName: r'completed')
  static const StationSwapStatus completed = _$completed;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const StationSwapStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'failed')
  static const StationSwapStatus failed = _$failed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const StationSwapStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<StationSwapStatus> get serializer =>
      _$stationSwapStatusSerializer;

  const StationSwapStatus._(String name) : super(name);

  static BuiltSet<StationSwapStatus> get values => _$values;
  static StationSwapStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class StationSwapStatusMixin = Object with _$StationSwapStatusMixin;
