//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/sim_card_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'sim_card_summary.g.dart';

/// SimCardSummary
///
/// Properties:
/// * [id]
/// * [iccid]
/// * [msisdn]
/// * [carrier]
/// * [apn]
/// * [status]
@BuiltValue()
abstract class SimCardSummary
    implements Built<SimCardSummary, SimCardSummaryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'iccid')
  String get iccid;

  @BuiltValueField(wireName: r'msisdn')
  String? get msisdn;

  @BuiltValueField(wireName: r'carrier')
  String get carrier;

  @BuiltValueField(wireName: r'apn')
  String? get apn;

  @BuiltValueField(wireName: r'status')
  SimCardStatus get status;
  // enum statusEnum {  active,  suspended,  cancelled,  };

  SimCardSummary._();

  factory SimCardSummary([void updates(SimCardSummaryBuilder b)]) =
      _$SimCardSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SimCardSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SimCardSummary> get serializer =>
      _$SimCardSummarySerializer();
}

class _$SimCardSummarySerializer
    implements PrimitiveSerializer<SimCardSummary> {
  @override
  final Iterable<Type> types = const [SimCardSummary, _$SimCardSummary];

  @override
  final String wireName = r'SimCardSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SimCardSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'iccid';
    yield serializers.serialize(
      object.iccid,
      specifiedType: const FullType(String),
    );
    yield r'msisdn';
    yield object.msisdn == null
        ? null
        : serializers.serialize(
            object.msisdn,
            specifiedType: const FullType.nullable(String),
          );
    yield r'carrier';
    yield serializers.serialize(
      object.carrier,
      specifiedType: const FullType(String),
    );
    yield r'apn';
    yield object.apn == null
        ? null
        : serializers.serialize(
            object.apn,
            specifiedType: const FullType.nullable(String),
          );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SimCardStatus),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SimCardSummary object, {
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
    required SimCardSummaryBuilder result,
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
        case r'iccid':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.iccid = valueDes;
          break;
        case r'msisdn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.msisdn = valueDes;
          break;
        case r'carrier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.carrier = valueDes;
          break;
        case r'apn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.apn = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SimCardStatus),
          ) as SimCardStatus;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SimCardSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SimCardSummaryBuilder();
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
