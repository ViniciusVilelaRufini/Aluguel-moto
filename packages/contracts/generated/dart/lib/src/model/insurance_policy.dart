//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/policy_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_policy.g.dart';

/// InsurancePolicy
///
/// Properties:
/// * [id]
/// * [rentalId]
/// * [customerId]
/// * [coverage]
/// * [premiumCents]
/// * [payoutCents] - Repasse à seguradora.
/// * [status]
/// * [providerPolicyId]
/// * [issuedAt]
/// * [canceledAt]
@BuiltValue()
abstract class InsurancePolicy
    implements Built<InsurancePolicy, InsurancePolicyBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'premiumCents')
  int get premiumCents;

  /// Repasse à seguradora.
  @BuiltValueField(wireName: r'payoutCents')
  int? get payoutCents;

  @BuiltValueField(wireName: r'status')
  PolicyStatus get status;
  // enum statusEnum {  active,  canceled,  expired,  };

  @BuiltValueField(wireName: r'providerPolicyId')
  String? get providerPolicyId;

  @BuiltValueField(wireName: r'issuedAt')
  DateTime get issuedAt;

  @BuiltValueField(wireName: r'canceledAt')
  DateTime? get canceledAt;

  InsurancePolicy._();

  factory InsurancePolicy([void updates(InsurancePolicyBuilder b)]) =
      _$InsurancePolicy;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InsurancePolicyBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InsurancePolicy> get serializer =>
      _$InsurancePolicySerializer();
}

class _$InsurancePolicySerializer
    implements PrimitiveSerializer<InsurancePolicy> {
  @override
  final Iterable<Type> types = const [InsurancePolicy, _$InsurancePolicy];

  @override
  final String wireName = r'InsurancePolicy';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InsurancePolicy object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    yield r'premiumCents';
    yield serializers.serialize(
      object.premiumCents,
      specifiedType: const FullType(int),
    );
    if (object.payoutCents != null) {
      yield r'payoutCents';
      yield serializers.serialize(
        object.payoutCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(PolicyStatus),
    );
    if (object.providerPolicyId != null) {
      yield r'providerPolicyId';
      yield serializers.serialize(
        object.providerPolicyId,
        specifiedType: const FullType(String),
      );
    }
    yield r'issuedAt';
    yield serializers.serialize(
      object.issuedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.canceledAt != null) {
      yield r'canceledAt';
      yield serializers.serialize(
        object.canceledAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    InsurancePolicy object, {
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
    required InsurancePolicyBuilder result,
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
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'premiumCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.premiumCents = valueDes;
          break;
        case r'payoutCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.payoutCents = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PolicyStatus),
          ) as PolicyStatus;
          result.status = valueDes;
          break;
        case r'providerPolicyId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.providerPolicyId = valueDes;
          break;
        case r'issuedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.issuedAt = valueDes;
          break;
        case r'canceledAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.canceledAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InsurancePolicy deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InsurancePolicyBuilder();
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
