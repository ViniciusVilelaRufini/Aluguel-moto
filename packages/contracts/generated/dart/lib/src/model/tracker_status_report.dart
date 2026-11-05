//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_status_report.g.dart';

/// Resposta de `STATUS#` decodificada.
///
/// Properties:
/// * [batteryVolts]
/// * [externalVolts]
/// * [gprsOnline]
/// * [acc]
/// * [gpsOn]
/// * [relay]
/// * [sleep]
/// * [csq]
@BuiltValue()
abstract class TrackerStatusReport
    implements Built<TrackerStatusReport, TrackerStatusReportBuilder> {
  @BuiltValueField(wireName: r'batteryVolts')
  double? get batteryVolts;

  @BuiltValueField(wireName: r'externalVolts')
  double? get externalVolts;

  @BuiltValueField(wireName: r'gprsOnline')
  bool? get gprsOnline;

  @BuiltValueField(wireName: r'acc')
  bool? get acc;

  @BuiltValueField(wireName: r'gpsOn')
  bool? get gpsOn;

  @BuiltValueField(wireName: r'relay')
  bool? get relay;

  @BuiltValueField(wireName: r'sleep')
  bool? get sleep;

  @BuiltValueField(wireName: r'csq')
  int? get csq;

  TrackerStatusReport._();

  factory TrackerStatusReport([void updates(TrackerStatusReportBuilder b)]) =
      _$TrackerStatusReport;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackerStatusReportBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackerStatusReport> get serializer =>
      _$TrackerStatusReportSerializer();
}

class _$TrackerStatusReportSerializer
    implements PrimitiveSerializer<TrackerStatusReport> {
  @override
  final Iterable<Type> types = const [
    TrackerStatusReport,
    _$TrackerStatusReport
  ];

  @override
  final String wireName = r'TrackerStatusReport';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackerStatusReport object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'batteryVolts';
    yield object.batteryVolts == null
        ? null
        : serializers.serialize(
            object.batteryVolts,
            specifiedType: const FullType.nullable(double),
          );
    yield r'externalVolts';
    yield object.externalVolts == null
        ? null
        : serializers.serialize(
            object.externalVolts,
            specifiedType: const FullType.nullable(double),
          );
    yield r'gprsOnline';
    yield object.gprsOnline == null
        ? null
        : serializers.serialize(
            object.gprsOnline,
            specifiedType: const FullType.nullable(bool),
          );
    yield r'acc';
    yield object.acc == null
        ? null
        : serializers.serialize(
            object.acc,
            specifiedType: const FullType.nullable(bool),
          );
    yield r'gpsOn';
    yield object.gpsOn == null
        ? null
        : serializers.serialize(
            object.gpsOn,
            specifiedType: const FullType.nullable(bool),
          );
    yield r'relay';
    yield object.relay == null
        ? null
        : serializers.serialize(
            object.relay,
            specifiedType: const FullType.nullable(bool),
          );
    yield r'sleep';
    yield object.sleep == null
        ? null
        : serializers.serialize(
            object.sleep,
            specifiedType: const FullType.nullable(bool),
          );
    yield r'csq';
    yield object.csq == null
        ? null
        : serializers.serialize(
            object.csq,
            specifiedType: const FullType.nullable(int),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackerStatusReport object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required TrackerStatusReportBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'batteryVolts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.batteryVolts = valueDes;
          break;
        case r'externalVolts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.externalVolts = valueDes;
          break;
        case r'gprsOnline':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.gprsOnline = valueDes;
          break;
        case r'acc':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.acc = valueDes;
          break;
        case r'gpsOn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.gpsOn = valueDes;
          break;
        case r'relay':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.relay = valueDes;
          break;
        case r'sleep':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.sleep = valueDes;
          break;
        case r'csq':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.csq = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  TrackerStatusReport deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackerStatusReportBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
