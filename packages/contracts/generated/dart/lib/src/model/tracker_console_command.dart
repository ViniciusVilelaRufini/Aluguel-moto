//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/tracker_status_report.dart';
import 'package:volti_api/src/model/tracker_console_status.dart';
import 'package:volti_api/src/model/tracker_console_fail_reason.dart';
import 'package:volti_api/src/model/tracker_console_risk.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_console_command.g.dart';

/// TrackerConsoleCommand
///
/// Properties:
/// * [id]
/// * [vehicleId]
/// * [text]
/// * [risk]
/// * [status]
/// * [failReason]
/// * [response] - Texto bruto devolvido pelo rastreador.
/// * [statusReport] - Só quando a resposta é de `STATUS#`.
/// * [requestedById]
/// * [createdAt]
/// * [respondedAt]
@BuiltValue()
abstract class TrackerConsoleCommand
    implements Built<TrackerConsoleCommand, TrackerConsoleCommandBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'text')
  String get text;

  @BuiltValueField(wireName: r'risk')
  TrackerConsoleRisk get risk;
  // enum riskEnum {  read,  change,  connection,  };

  @BuiltValueField(wireName: r'status')
  TrackerConsoleStatus get status;
  // enum statusEnum {  pending,  answered,  failed,  };

  @BuiltValueField(wireName: r'failReason')
  TrackerConsoleFailReason? get failReason;
  // enum failReasonEnum {  offline,  timeout,  error,  };

  /// Texto bruto devolvido pelo rastreador.
  @BuiltValueField(wireName: r'response')
  String? get response;

  /// Só quando a resposta é de `STATUS#`.
  @BuiltValueField(wireName: r'statusReport')
  TrackerStatusReport? get statusReport;

  @BuiltValueField(wireName: r'requestedById')
  String get requestedById;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'respondedAt')
  DateTime? get respondedAt;

  TrackerConsoleCommand._();

  factory TrackerConsoleCommand(
      [void updates(TrackerConsoleCommandBuilder b)]) = _$TrackerConsoleCommand;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackerConsoleCommandBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackerConsoleCommand> get serializer =>
      _$TrackerConsoleCommandSerializer();
}

class _$TrackerConsoleCommandSerializer
    implements PrimitiveSerializer<TrackerConsoleCommand> {
  @override
  final Iterable<Type> types = const [
    TrackerConsoleCommand,
    _$TrackerConsoleCommand
  ];

  @override
  final String wireName = r'TrackerConsoleCommand';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackerConsoleCommand object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'text';
    yield serializers.serialize(
      object.text,
      specifiedType: const FullType(String),
    );
    yield r'risk';
    yield serializers.serialize(
      object.risk,
      specifiedType: const FullType(TrackerConsoleRisk),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(TrackerConsoleStatus),
    );
    yield r'failReason';
    yield object.failReason == null
        ? null
        : serializers.serialize(
            object.failReason,
            specifiedType: const FullType.nullable(TrackerConsoleFailReason),
          );
    yield r'response';
    yield object.response == null
        ? null
        : serializers.serialize(
            object.response,
            specifiedType: const FullType.nullable(String),
          );
    yield r'statusReport';
    yield object.statusReport == null
        ? null
        : serializers.serialize(
            object.statusReport,
            specifiedType: const FullType.nullable(TrackerStatusReport),
          );
    yield r'requestedById';
    yield serializers.serialize(
      object.requestedById,
      specifiedType: const FullType(String),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'respondedAt';
    yield object.respondedAt == null
        ? null
        : serializers.serialize(
            object.respondedAt,
            specifiedType: const FullType.nullable(DateTime),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackerConsoleCommand object, {
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
    required TrackerConsoleCommandBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'text':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.text = valueDes;
          break;
        case r'risk':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TrackerConsoleRisk),
          ) as TrackerConsoleRisk;
          result.risk = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TrackerConsoleStatus),
          ) as TrackerConsoleStatus;
          result.status = valueDes;
          break;
        case r'failReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(TrackerConsoleFailReason),
          ) as TrackerConsoleFailReason?;
          if (valueDes == null) continue;
          result.failReason = valueDes;
          break;
        case r'response':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.response = valueDes;
          break;
        case r'statusReport':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(TrackerStatusReport),
          ) as TrackerStatusReport?;
          if (valueDes == null) continue;
          result.statusReport.replace(valueDes);
          break;
        case r'requestedById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.requestedById = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'respondedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.respondedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  TrackerConsoleCommand deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackerConsoleCommandBuilder();
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
