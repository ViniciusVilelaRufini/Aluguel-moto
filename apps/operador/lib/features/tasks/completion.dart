import 'package:volti_api/volti_api.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

/// O que ainda falta para concluir a tarefa (regra do design: modo servico +
/// checklist completo + foto; troca de bateria registrada nas tarefas de bateria).
enum CompletionBlocker { serviceUnlock, checklist, photo, batterySwap }

List<CompletionBlocker> completionBlockers({
  required FieldTask task,
  required bool unlocked,
  required InspectionDraft draft,
  required bool inspectionRegistered,
  required bool swapRegistered,
}) =>
    [
      if (!unlocked) CompletionBlocker.serviceUnlock,
      if (!inspectionRegistered && !(draft.allAnswered && draft.readingValid))
        CompletionBlocker.checklist,
      if (!inspectionRegistered && draft.photoPaths.isEmpty) CompletionBlocker.photo,
      if (task.type == FieldTaskType.batterySwap && !swapRegistered)
        CompletionBlocker.batterySwap,
    ];

String blockerLabel(AppLocalizations t, CompletionBlocker b) => switch (b) {
      CompletionBlocker.serviceUnlock => t.blockerServiceUnlock,
      CompletionBlocker.checklist => t.blockerChecklist,
      CompletionBlocker.photo => t.blockerPhoto,
      CompletionBlocker.batterySwap => t.blockerBatterySwap,
    };

/// "Para concluir: destrave em modo serviço, complete o checklist e tire a foto."
String completionHint(AppLocalizations t, List<CompletionBlocker> blockers) {
  final parts = blockers.map((b) => blockerLabel(t, b)).toList();
  final joined = parts.length <= 1
      ? parts.join()
      : '${parts.sublist(0, parts.length - 1).join(', ')} e ${parts.last}';
  return t.completeHint(joined);
}
