import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/depot_time.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Folha "Defeito na bateria BT-...": motivo obrigatorio (3 a 500 caracteres).
/// Fecha devolvendo o motivo ja sem espacos nas pontas.
class DefectSheet extends StatefulWidget {
  const DefectSheet({super.key, required this.serial});

  final String serial;

  @override
  State<DefectSheet> createState() => _DefectSheetState();
}

class _DefectSheetState extends State<DefectSheet> {
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final valid = validDefectReason(_reason.text);
    return VoltiBottomSheet(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              child: Text(
                t.batDefectTitle(widget.serial),
                style: VoltiTypography.heading,
              ),
            ),
            const SizedBox(height: VoltiSpacing.s8),
            Text(t.batDefectHint, style: VoltiTypography.body),
            const SizedBox(height: VoltiSpacing.s12),
            TextField(
              key: const Key('defect-reason'),
              controller: _reason,
              maxLength: 500,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: t.batDefectReason,
                errorText: _reason.text.isNotEmpty && !valid
                    ? t.batDefectReasonInvalid
                    : null,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: VoltiSpacing.s12),
            VoltiButton(
              key: const Key('defect-confirm'),
              label: t.batDefectConfirm,
              variant: VoltiButtonVariant.danger,
              fullWidth: true,
              onPressed: valid
                  ? () => Navigator.of(context).pop(_reason.text.trim())
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

/// Folha "Movimentacoes de BT-...": mais recente primeiro, "Ver mais antigas"
/// segue o cursor. Horario no fuso do galpao da movimentacao (padrao: Sao Paulo).
class BatteryHistorySheet extends ConsumerStatefulWidget {
  const BatteryHistorySheet({super.key, required this.battery});

  final Battery battery;

  @override
  ConsumerState<BatteryHistorySheet> createState() =>
      _BatteryHistorySheetState();
}

class _BatteryHistorySheetState extends ConsumerState<BatteryHistorySheet> {
  /// Cursor de cada pagina ja pedida; a primeira e `null`.
  final _cursors = <String?>[null];

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final depots = ref.watch(depotsProvider).value;
    final pages = [
      for (final c in _cursors)
        ref.watch(batteryMovementsProvider((id: widget.battery.id, cursor: c))),
    ];
    final items = <BatteryMovement>[];
    for (final p in pages) {
      final page = p.value;
      if (page != null) items.addAll(page.items);
    }
    final last = pages.last;
    return VoltiBottomSheet(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              child: Text(
                t.batHistoryTitle(widget.battery.serial),
                style: VoltiTypography.heading,
              ),
            ),
            const SizedBox(height: VoltiSpacing.s8),
            for (final m in items)
              _MovementRow(movement: m, zone: depotZone(depots, m.depotId)),
            if (last.isLoading)
              const Padding(
                padding: EdgeInsets.all(VoltiSpacing.s16),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (last.hasError)
              Padding(
                padding: const EdgeInsets.only(top: VoltiSpacing.s8),
                child: Notice(
                  key: const Key('history-error'),
                  tone: NoticeTone.neutral,
                  icon: LucideIcons.cloudOff,
                  title: t.batHistoryError,
                ),
              )
            else if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s16),
                child: Text(t.batHistoryEmpty, key: const Key('history-empty')),
              )
            else if (last.value?.nextCursor != null)
              Padding(
                padding: const EdgeInsets.only(top: VoltiSpacing.s8),
                child: VoltiButton(
                  key: const Key('history-more'),
                  label: t.batHistoryMore,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () =>
                      setState(() => _cursors.add(last.value!.nextCursor)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MovementRow extends StatelessWidget {
  const _MovementRow({required this.movement, required this.zone});

  final BatteryMovement movement;
  final String zone;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final m = movement;
    final to = batteryStatusLabel(t, m.toStatus);
    final from = m.fromStatus;
    final change = from == null
        ? t.batMovementCreated(to)
        : t.batMovementChange(batteryStatusLabel(t, from), to);
    final when = depotDayHhmm(m.at, zone);
    return Semantics(
      container: true,
      label: t.batMovementSemantics(
        when,
        [change, if (m.reason != null) m.reason!].join('. '),
      ),
      excludeSemantics: true,
      child: Padding(
        key: Key('movement-${m.id}'),
        padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              change,
              style: VoltiTypography.body.copyWith(fontWeight: FontWeight.w600),
            ),
            Text(
              when,
              style: VoltiTypography.caption.copyWith(
                color: VoltiColors.textSecondary,
              ),
            ),
            if (m.reason != null)
              Text(
                m.reason!,
                style: VoltiTypography.caption.copyWith(
                  color: VoltiColors.textSecondary,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
