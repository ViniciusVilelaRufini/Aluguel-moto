//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/top_up_status.dart';
import 'package:volti_api/src/model/pix_charge.dart';
import 'package:volti_api/src/model/top_up_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'top_up.g.dart';

/// TopUp
///
/// Properties:
/// * [id]
/// * [status]
/// * [method]
/// * [amountCents]
/// * [packageId]
/// * [minutes]
/// * [pix]
/// * [paymentId]
/// * [createdAt]
@BuiltValue()
abstract class TopUp implements Built<TopUp, TopUpBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'status')
  TopUpStatus get status;
  // enum statusEnum {  pending,  paid,  failed,  expired,  };

  @BuiltValueField(wireName: r'method')
  TopUpMethod get method;
  // enum methodEnum {  card,  pix,  };

  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'packageId')
  String? get packageId;

  @BuiltValueField(wireName: r'minutes')
  int? get minutes;

  @BuiltValueField(wireName: r'pix')
  PixCharge? get pix;

  @BuiltValueField(wireName: r'paymentId')
  String? get paymentId;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  TopUp._();

  factory TopUp([void updates(TopUpBuilder b)]) = _$TopUp;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TopUpBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TopUp> get serializer => _$TopUpSerializer();
}

class _$TopUpSerializer implements PrimitiveSerializer<TopUp> {
  @override
  final Iterable<Type> types = const [TopUp, _$TopUp];

  @override
  final String wireName = r'TopUp';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TopUp object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(TopUpStatus),
    );
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(TopUpMethod),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.packageId != null) {
      yield r'packageId';
      yield serializers.serialize(
        object.packageId,
        specifiedType: const FullType(String),
      );
    }
    if (object.minutes != null) {
      yield r'minutes';
      yield serializers.serialize(
        object.minutes,
        specifiedType: const FullType(int),
      );
    }
    if (object.pix != null) {
      yield r'pix';
      yield serializers.serialize(
        object.pix,
        specifiedType: const FullType(PixCharge),
      );
    }
    if (object.paymentId != null) {
      yield r'paymentId';
      yield serializers.serialize(
        object.paymentId,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    TopUp object, {
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
    required TopUpBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TopUpStatus),
          ) as TopUpStatus;
          result.status = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TopUpMethod),
          ) as TopUpMethod;
          result.method = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'packageId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.packageId = valueDes;
          break;
        case r'minutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.minutes = valueDes;
          break;
        case r'pix':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PixCharge),
          ) as PixCharge?;
          if (valueDes == null) continue;
          result.pix.replace(valueDes);
          break;
        case r'paymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.paymentId = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  TopUp deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TopUpBuilder();
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
