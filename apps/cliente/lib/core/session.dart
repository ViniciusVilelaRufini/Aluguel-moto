import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'auth_store.dart';
import 'backend.dart';
import 'cognito.dart';
import 'cognito_auth.dart';
import 'errors.dart';

class SessionState {
  const SessionState({required this.signedIn, this.customer, this.consents});
  const SessionState.signedOut()
      : signedIn = false,
        customer = null,
        consents = null;

  final bool signedIn;
  final Customer? customer;
  final Consents? consents;

  bool get termsAccepted => consents?.termsAccepted ?? false;
  bool get locationConsent => consents?.locationTracking ?? customer?.locationConsent ?? false;
  KycStatus get kyc => customer?.kycStatus ?? KycStatus.notStarted;

  /// Onboarding concluido: termos aceitos e documentos enviados. O consentimento de
  /// localizacao e opcional no cadastro: o Plano pede antes do aluguel (a API exige).
  bool get onboardingDone => signedIn && termsAccepted && kyc != KycStatus.notStarted;
}

class SessionNotifier extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    final auth = ref.read(authRepositoryProvider);
    if (auth.session == null) return const SessionState.signedOut();
    try {
      return await _load();
    } catch (e) {
      // Token restaurado recusado: volta ao login.
      if (toFailure(e).kind == FailureKind.unauthorized) {
        await auth.signOut();
        return const SessionState.signedOut();
      }
      rethrow;
    }
  }

  Future<SessionState> _load() async {
    final backend = ref.read(backendProvider);
    final me = await backend.me();
    Consents? consents;
    try {
      consents = await backend.consents();
    } catch (_) {
      consents = null;
    }
    return SessionState(signedIn: true, customer: me.customer, consents: consents);
  }

  /// Login de desenvolvimento (`POST /dev/token`, pool customer). O modo cognito usa a mesma interface.
  Future<void> signIn(String email) async {
    final auth = ref.read(authRepositoryProvider);
    final sub = email.trim().toLowerCase();
    if (auth is PersistentDevAuthRepository) {
      await auth.signIn(sub: sub, email: email.trim());
    } else if (auth is DevAuthRepository) {
      await auth.signIn(sub: sub, email: email.trim(), pool: DevAuthPool.customer);
    } else {
      throw AppFailure(kind: FailureKind.unknown);
    }
    state = const AsyncLoading<SessionState>();
    state = await AsyncValue.guard(_load);
  }

  /// Login concluido fora daqui (codigo por SMS/e-mail): carrega a sessao e, se veio
  /// por celular, grava o telefone no perfil (`MeUpdate.phone`, E.164). Falha ao gravar
  /// o telefone nao impede o login.
  Future<void> completeSignIn({String? phone}) async {
    state = const AsyncLoading<SessionState>();
    state = await AsyncValue.guard(_load);
    final current = state.value;
    if (phone == null || current == null || !current.signedIn) return;
    if ((current.customer?.phone ?? '').isNotEmpty) return;
    try {
      await ref.read(backendProvider).updateProfile(phone: phone);
      await refresh();
    } catch (_) {}
  }

  /// Google ou Apple pelo Hosted UI do Cognito (so no modo `cognito`).
  Future<void> signInWithProvider(IdentityProvider provider) async {
    final auth = ref.read(authRepositoryProvider);
    if (auth is! CognitoCustomerAuthRepository) throw const CognitoException('NotConfigured');
    await auth.signInWithProvider(provider);
    state = const AsyncLoading<SessionState>();
    state = await AsyncValue.guard(_load);
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(_load);
  }

  /// Grava termos e consentimento de localizacao (LGPD) e recarrega a sessao.
  Future<void> saveConsents({required bool terms, required bool location, bool marketing = false}) async {
    await ref.read(backendProvider).updateConsents(terms: terms, location: location, marketing: marketing);
    await refresh();
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AsyncData(SessionState.signedOut());
  }
}

final sessionProvider = AsyncNotifierProvider<SessionNotifier, SessionState>(SessionNotifier.new);
