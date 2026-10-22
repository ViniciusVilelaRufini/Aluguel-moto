//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_summary.g.dart';

/// ReferralSummary
///
/// Properties:
/// * [code]
/// * [inviteUrl]
/// * [shareMessage] - Texto pronto para compartilhar (pt-BR).
/// * [referrerRewardCents] - O que o cliente ganha por amigo que termina a primeira corrida.
/// * [refereeRewardCents] - O que o amigo ganha ao usar o código.
/// * [invitedCount]
/// * [qualifiedCount] - Amigos que já terminaram a primeira corrida.
/// * [totalEarnedCents]
/// * [referredBy] - Primeiro nome de quem indicou o cliente (se houver).
@BuiltValue()
abstract class ReferralSummary
    implements Built<ReferralSummary, ReferralSummaryBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'inviteUrl')
  String get inviteUrl;

  /// Texto pronto para compartilhar (pt-BR).
  @BuiltValueField(wireName: r'shareMessage')
  String get shareMessage;

  /// O que o cliente ganha por amigo que termina a primeira corrida.
  @BuiltValueField(wireName: r'referrerRewardCents')
  int get referrerRewardCents;

  /// O que o amigo ganha ao usar o código.
  @BuiltValueField(wireName: r'refereeRewardCents')
  int get refereeRewardCents;

  @BuiltValueField(wireName: r'invitedCount')
  int get invitedCount;

  /// Amigos que já terminaram a primeira corrida.
  @BuiltValueField(wireName: r'qualifiedCount')
  int get qualifiedCount;

  @BuiltValueField(wireName: r'totalEarnedCents')
  int get totalEarnedCents;

  /// Primeiro nome de quem indicou o cliente (se houver).
  @BuiltValueField(wireName: r'referredBy')
  String? get referredBy;

  ReferralSummary._();

  factory ReferralSummary([void updates(ReferralSummaryBuilder b)]) =
      _$ReferralSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReferralSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReferralSummary> get serializer =>
      _$ReferralSummarySerializer();
}

class _$ReferralSummarySerializer
    implements PrimitiveSerializer<ReferralSummary> {
  @override
  final Iterable<Type> types = const [ReferralSummary, _$ReferralSummary];

  @override
  final String wireName = r'ReferralSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReferralSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'inviteUrl';
    yield serializers.serialize(
      object.inviteUrl,
      specifiedType: const FullType(String),
    );
    yield r'shareMessage';
    yield serializers.serialize(
      object.shareMessage,
      specifiedType: const FullType(String),
    );
    yield r'referrerRewardCents';
    yield serializers.serialize(
      object.referrerRewardCents,
      specifiedType: const FullType(int),
    );
    yield r'refereeRewardCents';
    yield serializers.serialize(
      object.refereeRewardCents,
      specifiedType: const FullType(int),
    );
    yield r'invitedCount';
    yield serializers.serialize(
      object.invitedCount,
      specifiedType: const FullType(int),
    );
    yield r'qualifiedCount';
    yield serializers.serialize(
      object.qualifiedCount,
      specifiedType: const FullType(int),
    );
    yield r'totalEarnedCents';
    yield serializers.serialize(
      object.totalEarnedCents,
      specifiedType: const FullType(int),
    );
    if (object.referredBy != null) {
      yield r'referredBy';
      yield serializers.serialize(
        object.referredBy,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ReferralSummary object, {
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
    required ReferralSummaryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'inviteUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.inviteUrl = valueDes;
          break;
        case r'shareMessage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.shareMessage = valueDes;
          break;
        case r'referrerRewardCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.referrerRewardCents = valueDes;
          break;
        case r'refereeRewardCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.refereeRewardCents = valueDes;
          break;
        case r'invitedCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.invitedCount = valueDes;
          break;
        case r'qualifiedCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.qualifiedCount = valueDes;
          break;
        case r'totalEarnedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalEarnedCents = valueDes;
          break;
        case r'referredBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.referredBy = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReferralSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReferralSummaryBuilder();
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
