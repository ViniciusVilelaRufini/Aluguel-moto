import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_time.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/features/inspection/inspection_page.dart' show AnswerChip;
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// "14:30" no fuso do galpao (`Depot.timezone`), nunca no do aparelho.
String hhmm(DateTime d, String zone) => depotHhmm(d, zone);

String checklistLabel(AppLocalizations t, String code) => switch (code) {
      'freios' => t.hoItemFreios,
      'luzes' => t.hoItemLuzes,
      'pneus' => t.hoItemPneus,
      'buzina' => t.hoItemBuzina,
      'painel' => t.hoItemPainel,
      'carenagem' => t.hoItemCarenagem,
      _ => code,
    };

String photoAngleLabel(AppLocalizations t, PhotoAngle a) => switch (a) {
      PhotoAngle.front => t.photoFront,
      PhotoAngle.back => t.photoBack,
      PhotoAngle.left => t.photoLeft,
      PhotoAngle.right => t.photoRight,
    };

/// Status da reserva na agenda (rotulo e tom do badge).
(String, VoltiBadgeTone) reservationStatusBadge(AppLocalizations t, ReservationStatus s) =>
    switch (s) {
      ReservationStatus.active => (t.pickupStatusActive, VoltiBadgeTone.info),
      ReservationStatus.handover => (t.pickupStatusHandover, VoltiBadgeTone.warning),
      ReservationStatus.converted => (t.pickupStatusConverted, VoltiBadgeTone.success),
      ReservationStatus.canceled => (t.pickupStatusCanceled, VoltiBadgeTone.neutral),
      _ => (t.pickupStatusExpired, VoltiBadgeTone.neutral),
    };

/// "Retirar agora · até 14:30" ou "Agendada 15:00 · até 15:30".
String pickupWhen(AppLocalizations t, Reservation r, String zone) {
  if (r.pickupMode == PickupMode.scheduled && r.pickupAt != null) {
    return t.pickupScheduled(hhmm(r.pickupAt!, zone), hhmm(r.expiresAt, zone));
  }
  return t.pickupNow(hhmm(r.expiresAt, zone));
}

/// "Para enviar: responda todos os itens, informe a bateria e tire as 4 fotos."
String missingHint(AppLocalizations t, List<String> parts) {
  final joined = parts.length <= 1
      ? parts.join()
      : '${parts.sublist(0, parts.length - 1).join(', ')} e ${parts.last}';
  return t.submitMissing(joined);
}

/// Item do checklist da entrega: titulo e, embaixo, "Ok" / "Com problema"
/// (quebra bem com texto grande). Com problema, aparece o campo do motivo.
class HandoverItemRow extends StatelessWidget {
  const HandoverItemRow({
    super.key,
    required this.keyPrefix,
    required this.code,
    required this.value,
    required this.onChanged,
    this.note,
    this.onNote,
  });

  final String keyPrefix;
  final String code;
  final bool? value;
  final ValueChanged<bool> onChanged;
  final String? note;
  final ValueChanged<String>? onNote;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final title = checklistLabel(t, code);
    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ChecklistMark(value: value),
                const SizedBox(width: VoltiSpacing.s10),
                Expanded(child: Text(title, style: VoltiTypography.body)),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s4),
            Wrap(
              spacing: VoltiSpacing.s6,
              children: [
                AnswerChip(
                  key: Key('$keyPrefix-$code-ok'),
                  label: t.answerOk,
                  item: title,
                  selected: value == true,
                  onSelected: () => onChanged(true),
                ),
                AnswerChip(
                  key: Key('$keyPrefix-$code-problem'),
                  label: t.answerProblem,
                  item: title,
                  problem: true,
                  selected: value == false,
                  onSelected: () => onChanged(false),
                ),
              ],
            ),
            if (value == false && onNote != null) ...[
              const SizedBox(height: VoltiSpacing.s8),
              TextFormField(
                key: Key('note-$code'),
                initialValue: note,
                maxLength: 500,
                decoration: InputDecoration(labelText: t.problemNoteLabel, counterText: ''),
                onChanged: onNote,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Campo de porcentagem da bateria (0..100).
class BatteryPctField extends StatelessWidget {
  const BatteryPctField({
    super.key,
    required this.fieldKey,
    required this.controller,
    required this.onChanged,
  });

  final Key fieldKey;
  final TextEditingController controller;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final n = int.tryParse(controller.text);
    final invalid = controller.text.isNotEmpty && (n == null || n < 0 || n > 100);
    return TextField(
      key: fieldKey,
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(3),
      ],
      decoration: InputDecoration(
        labelText: t.batteryPctLabel,
        helperText: t.batteryPctHelp,
        helperMaxLines: 2,
        errorText: invalid ? t.batteryPctInvalid : null,
        errorMaxLines: 2,
        prefixIcon: const Icon(LucideIcons.batteryMedium, color: VoltiColors.textTertiary),
      ),
      onChanged: (v) => onChanged(int.tryParse(v)),
    );
  }
}

/// Foto obrigatoria de um angulo (linha tocavel; refaz ao tocar de novo).
class PhotoSlotRow extends StatelessWidget {
  const PhotoSlotRow({super.key, required this.label, required this.done, required this.onTap});

  final String label;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return ListRow(
      icon: done ? LucideIcons.circleCheck : LucideIcons.camera,
      iconTone: done ? ListRowTone.brand : ListRowTone.neutral,
      title: label,
      subtitle: done ? t.photoSlotDone : t.photoSlotEmpty,
      trailing: ListRowTrailing.none,
      onTap: onTap,
    );
  }
}

/// Escolha do galpao (OptionCard do VDS). Com um galpao so, mostra so o nome.
class DepotPicker extends StatelessWidget {
  const DepotPicker({super.key, required this.depots, required this.selected, required this.onSelect});

  final List<Depot> depots;
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final d in depots)
          Padding(
            padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
            // Um no so para o leitor de tela: nome, endereco, marcado e toque
            // (no OptionCard o estado e o toque ficam em nos separados).
            child: Semantics(
              key: Key('depot-${d.id}'),
              container: true,
              button: true,
              inMutuallyExclusiveGroup: true,
              checked: d.id == selected,
              label: '${d.name}, ${d.address}',
              onTap: () => onSelect(d.id),
              excludeSemantics: true,
              child: OptionCard(
                title: d.name,
                description: d.address,
                icon: LucideIcons.warehouse,
                selected: d.id == selected,
                onTap: () => onSelect(d.id),
              ),
            ),
          ),
      ],
    );
  }
}

/// Barra inferior fixa com o motivo do bloqueio e o botao principal.
class SubmitBar extends StatelessWidget {
  const SubmitBar({super.key, required this.button, this.hint, this.notice});

  final Widget button;
  final String? hint;

  /// Aviso do ultimo envio (sem rede, codigo invalido...), acima do botao.
  final Widget? notice;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
          VoltiSpacing.screenGutter, MediaQuery.paddingOf(context).bottom + VoltiSpacing.s16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        boxShadow: VoltiShadows.shadowSheet,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (notice != null)
            Padding(padding: const EdgeInsets.only(bottom: VoltiSpacing.s8), child: notice)
          else if (hint != null)
            Padding(
              padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  hint!,
                  key: const Key('submit-hint'),
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary),
                ),
              ),
            ),
          button,
        ],
      ),
    );
  }
}

/// Titulo de secao dentro das listas.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.hint});

  final String text;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, VoltiSpacing.s12, 0, VoltiSpacing.s8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(text, style: VoltiTypography.label)),
          if (hint != null)
            Text(hint!, style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
        ],
      ),
    );
  }
}

/// Etiqueta de status com as cores do `Badge` do VDS, mas que quebra linha
/// com texto grande (o badge do VDS tem altura fixa de 20 px).
class StatusTag extends StatelessWidget {
  const StatusTag(this.label, {super.key, required this.tone, this.icon});

  final String label;
  final VoltiBadgeTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = VoltiBadge.colorsFor(tone, VoltiPalette.of(context));
    return Container(
      constraints: const BoxConstraints(minHeight: 20),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rXs),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: VoltiTypography.fontSans,
                fontWeight: VoltiTypography.fwSemibold,
                fontSize: 11,
                height: 1.2,
                color: fg,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
