import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'core/offline_banner.dart';
import 'core/router.dart';
import 'l10n/app_localizations.dart';

class VoltiClienteApp extends ConsumerWidget {
  const VoltiClienteApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Volti',
      debugShowCheckedModeBanner: false,
      theme: VoltiTheme.light(),
      darkTheme: VoltiTheme.dark(),
      themeMode: ThemeMode.system,
      locale: const Locale('pt', 'BR'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: ref.watch(routerProvider),
      // Faixa "Sem conexão" por cima de todas as telas (E-17).
      // Textos de leitor de tela do loading/sucesso dos botoes (E-21).
      // Barra de status e de navegacao no tom do tema (telas sem AppBar, como a
      // home sobre o mapa, nao herdam o `systemOverlayStyle` do AppBarTheme).
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        value: VoltiTheme.overlayStyle(Theme.of(context).brightness),
        child: VoltiButtonLabels(
          loading: AppLocalizations.of(context).buttonBusy,
          success: AppLocalizations.of(context).buttonDone,
          child: OfflineBanner(child: child ?? const SizedBox.shrink()),
        ),
      ),
    );
  }
}
