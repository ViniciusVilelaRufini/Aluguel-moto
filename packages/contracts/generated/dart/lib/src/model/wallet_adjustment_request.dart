//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'wallet_adjustment_request.g.dart';

/// WalletAdjustmentRequest
///
/// Properties:
/// * [amountCents] - Diferente de zero.
/// * [reason]
@BuiltValue()
abstract class WalletAdjustmentRequest
    implements Built<WalletAdjustmentRequest, WalletAdjustmentRequestBuilder> {
  /// Diferente de zero.
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  WalletAdjustmentRequest._();

  factory WalletAdjustmentRequest(
          [void updates(WalletAdjustmentRequestBuilder b)]) =
      _$WalletAdjustmentRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(WalletAdjustmentRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<WalletAdjustmentRequest> get serializer =>
      _$WalletAdjustmentRequestSerializer();
}

class _$WalletAdjustmentRequestSerializer
    implements PrimitiveSerializer<WalletAdjustmentRequest> {
  @override
  final Iterable<Type> types = const [
    WalletAdjustmentRequest,
    _$WalletAdjustmentRequest
  ];

  @override
  final String wireName = r'WalletAdjustmentRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    WalletAdjustmentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    WalletAdjustmentRequest object, {
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
    required WalletAdjustmentRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  WalletAdjustmentRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = WalletAdjustmentRequestBuilder();
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
