//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/customer_status.dart';
import 'package:volti_api/src/model/kyc_status.dart';
import 'package:volti_api/src/model/date.dart';
import 'package:volti_api/src/model/customer_stats.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer.g.dart';

/// Customer
///
/// Properties:
/// * [id]
/// * [name]
/// * [email]
/// * [phone]
/// * [cpf] - Completo para o próprio cliente e para `admin`; mascarado (`***.456.789-**`) para os demais grupos.
/// * [birthDate]
/// * [kycStatus]
/// * [status]
/// * [delinquent] - Inadimplente (sem novos aluguéis).
/// * [restricted] - CPF na lista de restrição.
/// * [blockedReason] - staff.
/// * [blockedAt]
/// * [locationConsent]
/// * [emergencyContactName]
/// * [emergencyContactPhone]
/// * [stats]
/// * [createdAt]
@BuiltValue()
abstract class Customer implements Built<Customer, CustomerBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'phone')
  String? get phone;

  /// Completo para o próprio cliente e para `admin`; mascarado (`***.456.789-**`) para os demais grupos.
  @BuiltValueField(wireName: r'cpf')
  String? get cpf;

  @BuiltValueField(wireName: r'birthDate')
  Date? get birthDate;

  @BuiltValueField(wireName: r'kycStatus')
  KycStatus get kycStatus;
  // enum kycStatusEnum {  not_started,  pending,  approved,  rejected,  };

  @BuiltValueField(wireName: r'status')
  CustomerStatus get status;
  // enum statusEnum {  active,  blocked,  deleted,  };

  /// Inadimplente (sem novos aluguéis).
  @BuiltValueField(wireName: r'delinquent')
  bool get delinquent;

  /// CPF na lista de restrição.
  @BuiltValueField(wireName: r'restricted')
  bool get restricted;

  /// staff.
  @BuiltValueField(wireName: r'blockedReason')
  String? get blockedReason;

  @BuiltValueField(wireName: r'blockedAt')
  DateTime? get blockedAt;

  @BuiltValueField(wireName: r'locationConsent')
  bool? get locationConsent;

  @BuiltValueField(wireName: r'emergencyContactName')
  String? get emergencyContactName;

  @BuiltValueField(wireName: r'emergencyContactPhone')
  String? get emergencyContactPhone;

  @BuiltValueField(wireName: r'stats')
  CustomerStats? get stats;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  Customer._();

  factory Customer([void updates(CustomerBuilder b)]) = _$Customer;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Customer> get serializer => _$CustomerSerializer();
}

class _$CustomerSerializer implements PrimitiveSerializer<Customer> {
  @override
  final Iterable<Type> types = const [Customer, _$Customer];

  @override
  final String wireName = r'Customer';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Customer object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
    if (object.phone != null) {
      yield r'phone';
      yield serializers.serialize(
        object.phone,
        specifiedType: const FullType(String),
      );
    }
    if (object.cpf != null) {
      yield r'cpf';
      yield serializers.serialize(
        object.cpf,
        specifiedType: const FullType(String),
      );
    }
    if (object.birthDate != null) {
      yield r'birthDate';
      yield serializers.serialize(
        object.birthDate,
        specifiedType: const FullType(Date),
      );
    }
    yield r'kycStatus';
    yield serializers.serialize(
      object.kycStatus,
      specifiedType: const FullType(KycStatus),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(CustomerStatus),
    );
    yield r'delinquent';
    yield serializers.serialize(
      object.delinquent,
      specifiedType: const FullType(bool),
    );
    yield r'restricted';
    yield serializers.serialize(
      object.restricted,
      specifiedType: const FullType(bool),
    );
    if (object.blockedReason != null) {
      yield r'blockedReason';
      yield serializers.serialize(
        object.blockedReason,
        specifiedType: const FullType(String),
      );
    }
    if (object.blockedAt != null) {
      yield r'blockedAt';
      yield serializers.serialize(
        object.blockedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.locationConsent != null) {
      yield r'locationConsent';
      yield serializers.serialize(
        object.locationConsent,
        specifiedType: const FullType(bool),
      );
    }
    if (object.emergencyContactName != null) {
      yield r'emergencyContactName';
      yield serializers.serialize(
        object.emergencyContactName,
        specifiedType: const FullType(String),
      );
    }
    if (object.emergencyContactPhone != null) {
      yield r'emergencyContactPhone';
      yield serializers.serialize(
        object.emergencyContactPhone,
        specifiedType: const FullType(String),
      );
    }
    if (object.stats != null) {
      yield r'stats';
      yield serializers.serialize(
        object.stats,
        specifiedType: const FullType(CustomerStats),
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
    Customer object, {
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
    required CustomerBuilder result,
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
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'phone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.phone = valueDes;
          break;
        case r'cpf':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cpf = valueDes;
          break;
        case r'birthDate':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Date),
          ) as Date?;
          if (valueDes == null) continue;
          result.birthDate = valueDes;
          break;
        case r'kycStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(KycStatus),
          ) as KycStatus;
          result.kycStatus = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CustomerStatus),
          ) as CustomerStatus;
          result.status = valueDes;
          break;
        case r'delinquent':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.delinquent = valueDes;
          break;
        case r'restricted':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.restricted = valueDes;
          break;
        case r'blockedReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.blockedReason = valueDes;
          break;
        case r'blockedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.blockedAt = valueDes;
          break;
        case r'locationConsent':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.locationConsent = valueDes;
          break;
        case r'emergencyContactName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactName = valueDes;
          break;
        case r'emergencyContactPhone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactPhone = valueDes;
          break;
        case r'stats':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(CustomerStats),
          ) as CustomerStats?;
          if (valueDes == null) continue;
          result.stats.replace(valueDes);
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
  Customer deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerBuilder();
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
