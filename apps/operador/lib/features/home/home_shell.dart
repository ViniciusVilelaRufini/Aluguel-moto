import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/features/pickups/pickups_page.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

/// Abas do app: Tarefas (rua) e Retiradas (galpao). A aba do galpao so e
/// montada quando visitada (nao carrega galpao nem abre o socket a toa).
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late int _index = widget.initialIndex;
  late final Set<int> _visited = {widget.initialIndex};

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: IndexedStack(
        index: _index,
        // Aba escondida com TickerMode desligado: solta o GPS e as animacoes.
        children: [
          TickerMode(
            enabled: _index == 0,
            child: _visited.contains(0) ? const TaskListPage() : const SizedBox.shrink(),
          ),
          TickerMode(
            enabled: _index == 1,
            child: _visited.contains(1) ? const PickupsPage() : const SizedBox.shrink(),
          ),
        ],
      ),
      // Rotulos da barra limitados a 150% (alvos fixos de 80 px); as telas
      // seguem o texto do sistema sem limite.
      bottomNavigationBar: MediaQuery.withClampedTextScaling(
        maxScaleFactor: 1.5,
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: scheme.surfaceContainerLowest,
            indicatorColor: VoltiColors.brandSoft,
            labelTextStyle: WidgetStateProperty.resolveWith((s) => VoltiTypography.caption.copyWith(
                  fontWeight: s.contains(WidgetState.selected)
                      ? VoltiTypography.fwSemibold
                      : null,
                  color: s.contains(WidgetState.selected)
                      ? VoltiColors.textBrand
                      : VoltiColors.textSecondary,
                )),
          ),
          child: NavigationBar(
            key: const Key('home-nav'),
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() {
              _index = i;
              _visited.add(i);
            }),
            destinations: [
              NavigationDestination(
                key: const Key('nav-tasks'),
                icon: const Icon(LucideIcons.clipboardList, color: VoltiColors.ink500),
                selectedIcon: const Icon(LucideIcons.clipboardList, color: VoltiColors.textBrand),
                label: t.navTasks,
              ),
              NavigationDestination(
                key: const Key('nav-pickups'),
                icon: const Icon(LucideIcons.warehouse, color: VoltiColors.ink500),
                selectedIcon: const Icon(LucideIcons.warehouse, color: VoltiColors.textBrand),
                label: t.navPickups,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
