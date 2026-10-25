import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'launcher.dart';
import 'widgets.dart';

/// Abre os Termos de uso ou a Politica de privacidade (mesmos links do rodape
/// da boas-vindas, `legalLinksProvider`). Sem URL publicada neste ambiente, ou
/// se nenhum app abrir, avisa em vez de falhar calado.
Future<void> openLegalDocument(BuildContext context, WidgetRef ref, Uri? uri) async {
  final l = context.l;
  if (uri == null) {
    VoltiToast.show(context, l.welcomeLegalUnavailable, tone: VoltiToastTone.info);
    return;
  }
  var ok = false;
  try {
    ok = await ref.read(urlLauncherProvider)(uri);
  } catch (_) {}
  if (!ok && context.mounted) VoltiToast.show(context, l.welcomeLegalOpenError, tone: VoltiToastTone.warning);
}
