import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Pendencias da fila offline: aguardando sincronizacao e recusadas.
class SyncPage extends ConsumerWidget {
  const SyncPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final s = ref.watch(syncControllerProvider);
    final ctrl = ref.read(syncControllerProvider.notifier);
    String label(JobKind k) => switch (k) {
          JobKind.inspection => t.jobInspection,
          JobKind.batterySwap => t.jobBatterySwap,
          JobKind.completeTask => t.jobCompleteTask,
        };
    return Scaffold(
      appBar: AppBar(title: Text(t.syncTitle)),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          if (s.jobs.isEmpty)
            Notice(tone: NoticeTone.success, icon: LucideIcons.circleCheck, title: t.syncEmpty),
          for (final j in s.jobs)
            Padding(
              padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
              child: SectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label(j.kind), style: VoltiTypography.bodyStrong),
                    const SizedBox(height: 4),
                    if (j.status == JobStatus.pending)
                      Text(t.awaitingSync, style: VoltiTypography.caption)
                    else ...[
                      Text(t.jobFailed(j.error ?? ''),
                          style: VoltiTypography.caption.copyWith(color: VoltiColors.dangerInk)),
                      const SizedBox(height: VoltiSpacing.s8),
                      Row(children: [
                        VoltiButton(
                            label: t.retry,
                            size: VoltiButtonSize.sm,
                            variant: VoltiButtonVariant.secondary,
                            onPressed: () => ctrl.retry(j.id)),
                        const SizedBox(width: VoltiSpacing.s8),
                        VoltiButton(
                            label: t.discard,
                            size: VoltiButtonSize.sm,
                            variant: VoltiButtonVariant.ghost,
                            onPressed: () => ctrl.discard(j.id)),
                      ]),
                    ],
                  ],
                ),
              ),
            ),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            label: t.syncNow,
            icon: LucideIcons.refreshCw,
            fullWidth: true,
            onPressed: s.syncing ? null : ctrl.sync,
          ),
        ],
      ),
    );
  }
}
