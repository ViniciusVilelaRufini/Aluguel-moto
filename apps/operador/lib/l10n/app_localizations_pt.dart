// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Volti Campo';

  @override
  String get loginTitle => 'Entrar';

  @override
  String get loginSubtitle => 'Operador de campo';

  @override
  String get loginEmail => 'E-mail';

  @override
  String get loginAction => 'Entrar';

  @override
  String get loginError =>
      'Não foi possível entrar. Verifique a conexão e tente de novo.';

  @override
  String get loginCognitoUnavailable =>
      'O login pelo Cognito ainda não está disponível neste ambiente.';

  @override
  String get signOut => 'Sair';

  @override
  String get headerRole => 'Operador de campo';

  @override
  String greeting(String name) {
    return 'Olá, $name';
  }

  @override
  String get statPending => 'Pendentes';

  @override
  String get statDone => 'Concluídas';

  @override
  String get statQueue => 'Na fila';

  @override
  String get tabToday => 'Hoje';

  @override
  String get tabDone => 'Concluídas';

  @override
  String get viewList => 'Lista';

  @override
  String get viewMap => 'Mapa';

  @override
  String get emptyTasks => 'Nada por aqui.';

  @override
  String get offlineCache => 'Sem rede. Mostrando as últimas tarefas salvas.';

  @override
  String get tasksError => 'Não foi possível carregar as tarefas.';

  @override
  String get retry => 'Tentar de novo';

  @override
  String get cancel => 'Cancelar';

  @override
  String get close => 'Fechar';

  @override
  String get errorGeneric => 'Algo deu errado. Tente de novo.';

  @override
  String get offlineAction =>
      'Sem rede. Tente de novo quando a conexão voltar.';

  @override
  String get back => 'Voltar';

  @override
  String get typeCollect => 'Recolher moto';

  @override
  String get typeBatterySwap => 'Trocar bateria';

  @override
  String get typeMaintenance => 'Levar para manutenção';

  @override
  String get typeReposition => 'Reposicionar';

  @override
  String get typeInspection => 'Inspecionar moto';

  @override
  String get priorityLow => 'Baixa';

  @override
  String get priorityMedium => 'Média';

  @override
  String get priorityHigh => 'Alta';

  @override
  String get priorityUrgent => 'Urgente';

  @override
  String get taskDetailTitle => 'Tarefa';

  @override
  String get taskNotFound => 'Tarefa não encontrada.';

  @override
  String get actionStart => 'Iniciar tarefa';

  @override
  String get actionRoute => 'Traçar rota';

  @override
  String get actionServiceUnlock => 'Destravar em modo serviço';

  @override
  String get serviceUnlockActive => 'Modo serviço ativo';

  @override
  String get serviceUnlockActiveBody =>
      'Sem cobrança. O destravamento fica registrado na auditoria.';

  @override
  String get serviceUnlockReason => 'Serviço de campo';

  @override
  String get actionChecklist => 'Checklist de inspeção';

  @override
  String get actionBatterySwap => 'Troca de bateria';

  @override
  String get actionSetStatus => 'Mudar status da moto';

  @override
  String get actionComplete => 'Concluir tarefa';

  @override
  String get sectionRegistered => 'Registrado';

  @override
  String get targetLabel => 'Destino do reposicionamento';

  @override
  String distanceToTarget(String km) {
    return '$km km até o destino';
  }

  @override
  String get completeTitle => 'Concluir tarefa';

  @override
  String get completeNotes => 'Observações';

  @override
  String get completeVehicleStatus => 'Status da moto ao concluir';

  @override
  String get keepStatus => 'Manter';

  @override
  String get statusAvailable => 'Disponível';

  @override
  String get statusMaintenance => 'Manutenção';

  @override
  String get completeConfirm => 'Concluir';

  @override
  String completeRequires(String what) {
    return 'Antes de concluir, registre: $what.';
  }

  @override
  String get taskCompleted => 'Tarefa concluída.';

  @override
  String get taskCompletePending =>
      'Conclusão salva. Aguardando sincronização.';

  @override
  String get statusSheetTitle => 'Mudar status da moto';

  @override
  String get statusReason => 'Motivo';

  @override
  String get statusReasonTooShort =>
      'Informe o motivo (mínimo de 3 caracteres).';

  @override
  String get statusChanged => 'Status da moto atualizado.';

  @override
  String get statusConfirm => 'Atualizar status';

  @override
  String get inspectionTitle => 'Checklist de inspeção';

  @override
  String get itemBrakes => 'Freio dianteiro e traseiro';

  @override
  String get itemTires => 'Pneus';

  @override
  String get itemLights => 'Luzes';

  @override
  String get itemBell => 'Campainha';

  @override
  String get itemSpeed => 'Limitador de velocidade';

  @override
  String get answerOk => 'Ok';

  @override
  String get answerProblem => 'Com problema';

  @override
  String get speedReadingLabel =>
      'Velocidade máxima lida no controlador (km/h)';

  @override
  String get speedReadingHelp =>
      'Leitura de 0 a 100. Acima de 32 km/h a moto está fora do limite legal.';

  @override
  String get speedReadingInvalid => 'Informe um valor de 0 a 100.';

  @override
  String get speedNonCompliant =>
      'Moto fora do limite legal — vai para manutenção';

  @override
  String itemsCounter(int done, int total) {
    return '$done/$total';
  }

  @override
  String get photoLabel => 'Foto da moto';

  @override
  String get photoHint => 'Obrigatória';

  @override
  String get photoAdd => 'Adicionar foto';

  @override
  String photoCount(int n) {
    return '$n foto(s) anexada(s)';
  }

  @override
  String get notesLabel => 'Observações';

  @override
  String get submitInspection => 'Enviar checklist';

  @override
  String get inspectionSent => 'Checklist enviado.';

  @override
  String get inspectionQueued => 'Checklist salvo. Aguardando sincronização.';

  @override
  String maintenanceOpened(String taskId, String alertId) {
    return 'Manutenção aberta (tarefa $taskId) e alerta registrado ($alertId). A moto foi para manutenção.';
  }

  @override
  String get awaitingSync => 'Aguardando sincronização';

  @override
  String get batteryTitle => 'Troca de bateria';

  @override
  String get batteryRemoved => 'Bateria retirada';

  @override
  String get batteryInstalled => 'Bateria instalada';

  @override
  String get serialHint => 'Número de série';

  @override
  String get scanAction => 'Ler QR ou código de barras';

  @override
  String get scanTitle => 'Aponte para o QR ou código de barras';

  @override
  String get scanCameraError =>
      'Não foi possível abrir a câmera. Digite o número de série.';

  @override
  String get serialsMustDiffer =>
      'Os números de série precisam ser diferentes.';

  @override
  String get serialTooShort => 'Mínimo de 3 caracteres.';

  @override
  String get submitSwap => 'Registrar troca';

  @override
  String get swapSent => 'Troca de bateria registrada.';

  @override
  String get swapQueued => 'Troca salva. Aguardando sincronização.';

  @override
  String get syncTitle => 'Pendências de envio';

  @override
  String get syncEmpty => 'Tudo sincronizado.';

  @override
  String get syncNow => 'Sincronizar agora';

  @override
  String get jobInspection => 'Checklist de inspeção';

  @override
  String get jobBatterySwap => 'Troca de bateria';

  @override
  String get jobCompleteTask => 'Conclusão de tarefa';

  @override
  String jobFailed(String reason) {
    return 'Recusado: $reason';
  }

  @override
  String get discard => 'Descartar';
}
