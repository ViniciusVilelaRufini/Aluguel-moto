import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'auth_store.dart';
import 'backend.dart';
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

  /// Onboarding concluido: termos, consentimento de localizacao e documentos enviados.
  bool get onboardingDone => signedIn && termsAccepted && locationConsent && kyc != KycStatus.notStarted;
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
