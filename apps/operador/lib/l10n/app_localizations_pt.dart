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

  @override
  String get loginCognitoAction => 'Entrar com a conta Volti';

  @override
  String get loginCognitoHint =>
      'Você entra pela página segura da Volti. O código de verificação (MFA) é pedido lá.';

  @override
  String get loginCampoRequired =>
      'Sua conta não tem acesso ao app de campo. Fale com a operação.';

  @override
  String loginCognitoMissing(String names) {
    return 'Login Cognito não configurado neste build (faltam: $names).';
  }

  @override
  String get accountTitle => 'Conta';

  @override
  String get accountMenu => 'Conta e pendências';

  @override
  String prioritySemantics(String priority) {
    return 'Prioridade $priority';
  }

  @override
  String distanceSemantics(String distance) {
    return 'A $distance de você';
  }

  @override
  String get dueLate => 'Atrasada';

  @override
  String dueAt(String time) {
    return 'Até $time';
  }

  @override
  String doneAt(String time) {
    return 'Concluída às $time';
  }

  @override
  String get locationRationaleTitle => 'Ative a localização';

  @override
  String get locationRationaleBody =>
      'Usamos sua localização só com o app aberto, para mostrar a distância até cada moto e o seu ponto no mapa.';

  @override
  String get locationAllow => 'Permitir localização';

  @override
  String get locationDeniedBody =>
      'A localização está bloqueada para o app. Libere nos ajustes para ver a distância até as motos.';

  @override
  String get locationServiceOff =>
      'O GPS está desligado. Ligue para ver a distância até as motos.';

  @override
  String get locationOpenSettings => 'Abrir ajustes';

  @override
  String get notNow => 'Agora não';

  @override
  String get offlineTitle => 'Sem conexão';

  @override
  String get offlineBody =>
      'O que você registrar fica salvo e é enviado quando a rede voltar.';

  @override
  String get loadingTasks => 'Carregando tarefas';

  @override
  String get openTask => 'Abrir tarefa';

  @override
  String get noVehiclePosition => 'Moto sem posição conhecida';

  @override
  String get yourLocation => 'Você está aqui';

  @override
  String get batteryRegister => 'Registrar troca';

  @override
  String batteryInstalledSummary(String serial) {
    return 'Instalada: $serial';
  }

  @override
  String get checklistOpen => 'Abrir checklist';

  @override
  String checklistItemOk(String item) {
    return '$item: ok';
  }

  @override
  String checklistItemProblem(String item) {
    return '$item: com problema';
  }

  @override
  String checklistItemPending(String item) {
    return '$item: não respondido';
  }

  @override
  String get photoAfterService => 'Foto da moto após o serviço';

  @override
  String get photoAddMore => 'Adicionar outra foto';

  @override
  String photoThumb(int n) {
    return 'Foto $n';
  }

  @override
  String photoRemove(int n) {
    return 'Remover foto $n';
  }

  @override
  String completeHint(String items) {
    return 'Para concluir: $items.';
  }

  @override
  String get blockerServiceUnlock => 'destrave em modo serviço';

  @override
  String get blockerChecklist => 'complete o checklist';

  @override
  String get blockerPhoto => 'tire a foto da moto';

  @override
  String get blockerBatterySwap => 'registre a troca de bateria';

  @override
  String get taskDoneTitle => 'Tarefa concluída';

  @override
  String get completionNotesLabel => 'Observações da conclusão';

  @override
  String get serialNewLabel => 'Nº de série da bateria nova';

  @override
  String get serialRemovedLabel => 'Nº de série da bateria retirada';

  @override
  String get serialPlaceholder => 'BT-000000';

  @override
  String get scanTorch => 'Lanterna';

  @override
  String get scanManual => 'Digitar o número';

  @override
  String get scanAimHint => 'Centralize o código na moldura';

  @override
  String vehicleStatusLabel(String status) {
    return 'Status da moto: $status';
  }

  @override
  String get rejectedHint =>
      'Corrija e reenvie em \"Pendências de envio\" para concluir a tarefa.';

  @override
  String get statVan => 'Baterias na van';

  @override
  String get statUnavailable => 'indisponível';

  @override
  String targetAddressLine(String address) {
    return 'Para: $address';
  }

  @override
  String cyclesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ciclos',
      one: '1 ciclo',
    );
    return '$_temp0';
  }

  @override
  String removedBatteryLine(String details) {
    return 'Retirada: $details';
  }

  @override
  String installedBatteryLine(String details) {
    return 'Instalada: $details';
  }

  @override
  String get vanTitle => 'Baterias na van';

  @override
  String get vanCharged => 'Carregadas';

  @override
  String get vanDepleted => 'Descarregadas';

  @override
  String get vanTotal => 'Total';

  @override
  String get vanEmpty => 'Nenhuma bateria na van.';

  @override
  String get vanError => 'Não foi possível carregar o estoque da van.';

  @override
  String get vanOnlineHint => 'Carregar e descarregar a van exige conexão.';

  @override
  String get vanLoad => 'Carregar baterias';

  @override
  String get vanLoadTitle => 'Carregar na van';

  @override
  String get vanLoadSerial => 'Nº de série da bateria';

  @override
  String get vanLoadAdd => 'Adicionar';

  @override
  String vanLoadRemove(String serial) {
    return 'Tirar $serial da lista';
  }

  @override
  String vanLoadConfirm(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count baterias',
      one: '1 bateria',
    );
    return 'Carregar $_temp0';
  }

  @override
  String get vanLoadDuplicate => 'Essa série já está na lista.';

  @override
  String get vanLoaded => 'Baterias carregadas na van.';

  @override
  String get vanUnload => 'Descarregar';

  @override
  String vanUnloadSemantics(String serial) {
    return 'Descarregar $serial';
  }

  @override
  String get vanUnloaded => 'Bateria descarregada para recarga.';

  @override
  String vanBatterySemantics(String serial, int pct, String cycles) {
    return 'Bateria $serial, $pct por cento, $cycles';
  }

  @override
  String get vanSuggestions => 'Carregadas na van';

  @override
  String vanPickSemantics(String serial) {
    return 'Usar a bateria $serial';
  }

  @override
  String get fleetServiceTitle => 'Revisões da frota';

  @override
  String get filterAll => 'Todas';

  @override
  String get filterOverdue => 'Vencidas';

  @override
  String get filterDueSoon => 'Próximas';

  @override
  String get serviceOk => 'Em dia';

  @override
  String get serviceDueSoon => 'Próxima';

  @override
  String get serviceOverdue => 'Vencida';

  @override
  String serviceStatusSemantics(String status) {
    return 'Revisão: $status';
  }

  @override
  String serviceKmSince(String km) {
    return '$km desde a revisão';
  }

  @override
  String serviceKmUntil(String km) {
    return 'faltam $km';
  }

  @override
  String serviceKmOver(String km) {
    return '$km além do previsto';
  }

  @override
  String serviceHours(String hours, String interval) {
    return '$hours h de uso desde a revisão (a cada $interval h)';
  }

  @override
  String serviceScheduled(String date) {
    return 'Revisão agendada para $date';
  }

  @override
  String get serviceEmpty => 'Nenhuma moto nesta situação.';

  @override
  String get serviceError => 'Não foi possível carregar as revisões.';

  @override
  String get vehicleCardTitle => 'Moto';

  @override
  String modelPhotoSemantics(String name) {
    return 'Foto do modelo $name';
  }

  @override
  String get maintenanceCardTitle => 'Manutenção';

  @override
  String maintenanceSourceCustomer(String name) {
    return 'Agendada pelo cliente $name';
  }

  @override
  String get maintenanceSourceCustomerNoName => 'Agendada pelo cliente';

  @override
  String get maintenanceSourceSystem => 'Aberta pela inspeção';

  @override
  String get maintenanceSourceStaff => 'Aberta pela operação';

  @override
  String get maintenanceKindPreventive => 'Preventiva';

  @override
  String get maintenanceKindCorrective => 'Corretiva';

  @override
  String maintenanceScheduledFor(String date) {
    return 'Agendada para $date';
  }

  @override
  String get navTasks => 'Tarefas';

  @override
  String get navPickups => 'Retiradas';

  @override
  String get pickupsTitle => 'Retiradas de hoje';

  @override
  String get pickupsDepotLabel => 'Galpão';

  @override
  String get depotChoose => 'Trocar galpão';

  @override
  String get depotChooseTitle => 'Em qual galpão você está?';

  @override
  String get depotChooseHint =>
      'Escolha o galpão para ver a agenda e registrar chegadas.';

  @override
  String get depotsError => 'Não foi possível carregar os galpões.';

  @override
  String get depotsEmpty => 'Nenhum galpão ativo.';

  @override
  String get pickupsError => 'Não foi possível carregar a agenda.';

  @override
  String get pickupsEmpty => 'Nenhuma retirada para hoje.';

  @override
  String pickupsDoneToday(int count) {
    return 'Concluídas hoje ($count)';
  }

  @override
  String get pickupsShowDone => 'Mostrar concluídas';

  @override
  String get pickupsHideDone => 'Esconder concluídas';

  @override
  String get pickupScanAction => 'Ler QR da reserva';

  @override
  String get arrivalAction => 'Registrar chegada';

  @override
  String pickupNow(String time) {
    return 'Retirar agora · até $time';
  }

  @override
  String pickupScheduled(String time, String deadline) {
    return 'Agendada $time · até $deadline';
  }

  @override
  String get pickupStatusActive => 'Aguardando retirada';

  @override
  String get pickupStatusHandover => 'Aguardando o cliente';

  @override
  String get pickupStatusConverted => 'Retirada';

  @override
  String get pickupStatusCanceled => 'Cancelada';

  @override
  String get pickupStatusExpired => 'Expirada';

  @override
  String get pickupDraftSaved => 'Rascunho salvo';

  @override
  String get customerFallback => 'Cliente';

  @override
  String pickupCardSemantics(
    String name,
    String vehicle,
    String when,
    String status,
  ) {
    return '$name, moto $vehicle. $when. $status';
  }

  @override
  String get pickupScanTitle => 'Ler QR da reserva';

  @override
  String get pickupScanBody =>
      'Peça ao cliente para abrir a reserva no app e aponte a câmera para o QR.';

  @override
  String get pickupScanOpenCamera => 'Abrir câmera';

  @override
  String get pickupScanAim => 'Aponte para o QR da reserva';

  @override
  String get pickupCodeLabel => 'Código da reserva';

  @override
  String get pickupCodeHint => 'Cole ou digite o código';

  @override
  String get pickupCodeContinue => 'Continuar';

  @override
  String get pickupCodeInvalid => 'Código inválido';

  @override
  String get pickupCodeInvalidBody =>
      'O código está vazio ou longo demais. Leia o QR de novo.';

  @override
  String get pickupCodeExpired => 'Código vencido';

  @override
  String get pickupCodeExpiredBody =>
      'Pelo relógio deste aparelho a reserva venceu. Se quiser, siga: a API confere no envio.';

  @override
  String get pickupNotInAgenda => 'Reserva fora da agenda de hoje';

  @override
  String get pickupNotInAgendaBody =>
      'Esta reserva não aparece na agenda de hoje deste galpão. A API confere no envio.';

  @override
  String get pickupNotActive => 'Esta reserva não está aguardando retirada';

  @override
  String get pickupChecklistTitle => 'Checklist de saída';

  @override
  String get hoItemFreios => 'Freios';

  @override
  String get hoItemLuzes => 'Luzes';

  @override
  String get hoItemPneus => 'Pneus';

  @override
  String get hoItemBuzina => 'Buzina';

  @override
  String get hoItemPainel => 'Painel';

  @override
  String get hoItemCarenagem => 'Carenagem';

  @override
  String get problemNoteLabel => 'O que há de errado? (opcional)';

  @override
  String get batteryPctLabel => 'Bateria (%)';

  @override
  String get batteryPctHelp => 'Leitura do painel, de 0 a 100.';

  @override
  String get batteryPctInvalid => 'Informe um valor de 0 a 100.';

  @override
  String get batterySerialLabel => 'Nº de série da bateria (opcional)';

  @override
  String get pickupPhotosTitle => 'Fotos da moto';

  @override
  String get pickupPhotosHint => 'Frente, trás e os dois lados (mínimo 4).';

  @override
  String get photoFront => 'Frente';

  @override
  String get photoBack => 'Trás';

  @override
  String get photoLeft => 'Lado esquerdo';

  @override
  String get photoRight => 'Lado direito';

  @override
  String get photoSlotEmpty => 'Tirar foto';

  @override
  String get photoSlotDone => 'Foto tirada · toque para refazer';

  @override
  String get photoExtraAdd => 'Adicionar outra foto';

  @override
  String get pickupSubmit => 'Enviar para o cliente';

  @override
  String submitMissing(String items) {
    return 'Para enviar: $items.';
  }

  @override
  String get missingChecklist => 'responda todos os itens';

  @override
  String get missingBattery => 'informe a bateria';

  @override
  String get missingPhotos => 'tire as 4 fotos';

  @override
  String get missingDepot => 'escolha o galpão';

  @override
  String get missingPhoto => 'tire uma foto';

  @override
  String get missingVehicle => 'informe a moto';

  @override
  String get pickupOffline => 'Sem conexão: envie quando voltar a rede';

  @override
  String get pickupOfflineBody =>
      'O rascunho fica guardado enquanto o app estiver aberto.';

  @override
  String get handoverTitle => 'Entrega da moto';

  @override
  String get handoverWaiting => 'Aguardando o cliente';

  @override
  String get handoverWaitingBody => 'O cliente confere a moto no app e aceita.';

  @override
  String get handoverAccepted => 'Aceito — moto liberada';

  @override
  String get handoverAcceptedBody =>
      'O aluguel começou. Pode entregar a moto ao cliente.';

  @override
  String get handoverPaymentDeclined => 'Pagamento não aprovado';

  @override
  String get handoverPaymentDeclinedBody =>
      'O cliente pode tentar outro pagamento no app. A moto continua travada.';

  @override
  String get handoverDisputed => 'Problema apontado';

  @override
  String handoverDisputedBody(String reason) {
    return 'O suporte vai analisar. Motivo: $reason';
  }

  @override
  String get handoverDisputedNoReason => 'O suporte vai analisar.';

  @override
  String get handoverCanceled => 'Entrega cancelada';

  @override
  String get handoverRefresh => 'Atualizar';

  @override
  String get handoverBackToAgenda => 'Voltar para a agenda';

  @override
  String get handoverLoadError => 'Não foi possível atualizar a entrega.';

  @override
  String handoverVehicle(String code) {
    return 'Moto $code';
  }

  @override
  String get arrivalTitle => 'Chegada no galpão';

  @override
  String get arrivalCollectTitle => 'Chegada do recolhimento';

  @override
  String get arrivalVehicleLabel => 'Código da moto';

  @override
  String get arrivalVehicleHint => 'Ex.: VLT-0001';

  @override
  String get arrivalVehicleFind => 'Conferir moto';

  @override
  String get arrivalScanVehicle => 'Ler QR da moto';

  @override
  String arrivalVehicleFound(String code) {
    return '$code · aluguel aberto';
  }

  @override
  String get arrivalNoRental => 'Esta moto não tem aluguel aberto.';

  @override
  String get arrivalVehicleNotFound => 'Moto não encontrada.';

  @override
  String get arrivalVehicleOffline =>
      'Sem conexão para conferir a moto. A chegada vai para a fila e é conferida no envio.';

  @override
  String get arrivalDepot => 'Galpão';

  @override
  String get arrivalProblem => 'A moto vai para manutenção';

  @override
  String get arrivalProblemBody => 'Algum item está com problema.';

  @override
  String get arrivalPhotosTitle => 'Fotos da chegada';

  @override
  String get arrivalPhotosHint => 'Pelo menos uma foto da moto.';

  @override
  String get arrivalSubmit => 'Registrar chegada';

  @override
  String get arrivalCollectSubmit => 'Concluir recolhimento';

  @override
  String get arrivalSent => 'Chegada registrada. Aluguel encerrado.';

  @override
  String get arrivalSentMaintenance =>
      'Chegada registrada. Moto em manutenção.';

  @override
  String get arrivalQueued => 'A chegada será enviada quando a rede voltar.';

  @override
  String get jobReturnHandover => 'Chegada no galpão';

  @override
  String get pickupCodeProceed => 'Continuar mesmo assim';

  @override
  String get arrivalVehicleAuth =>
      'Sua sessão expirou. Entre de novo para conferir a moto.';

  @override
  String get buttonBusy => 'Carregando…';

  @override
  String get buttonDone => 'Concluído';

  @override
  String get handoverCancelAction => 'Cancelar entrega';

  @override
  String get handoverCancelTitle => 'Cancelar a entrega?';

  @override
  String get handoverCancelHint =>
      'A moto não sai do galpão com esta entrega. Conte o motivo para a equipe.';

  @override
  String get handoverCancelReason => 'Motivo do cancelamento';

  @override
  String get handoverCancelReasonTooShort => 'Escreva pelo menos 3 caracteres.';

  @override
  String get handoverCancelContinue => 'Continuar';

  @override
  String get handoverCancelConfirmTitle => 'Confirmar o cancelamento';

  @override
  String handoverCancelConfirmBody(String code, String reason) {
    return 'Cancelar a entrega da moto $code? Motivo: $reason';
  }

  @override
  String get handoverCancelConfirm => 'Sim, cancelar entrega';

  @override
  String get handoverCancelBack => 'Voltar';

  @override
  String get handoverCancelDone => 'Entrega cancelada.';

  @override
  String get handoverCanceledBody =>
      'Se a reserva ainda estiver no prazo, registre uma nova saída pela agenda.';

  @override
  String get depotFleetTitle => 'Motos do galpão';

  @override
  String get depotFleetChoose => 'Escolha o galpão';

  @override
  String get depotFleetEmpty => 'Nenhuma moto com este status.';

  @override
  String get depotFleetError => 'Não foi possível carregar as motos.';

  @override
  String depotFleetSeen(String time) {
    return 'Último sinal $time';
  }

  @override
  String get depotFleetNoSignal => 'Sem sinal registrado';

  @override
  String get depotFleetFilter => 'Filtrar por status';

  @override
  String depotFleetSemantics(
    String code,
    String model,
    String status,
    int pct,
  ) {
    return '$code, $model, $status, bateria $pct%';
  }

  @override
  String get vsFree => 'Livre';

  @override
  String get vsRented => 'Alugada';

  @override
  String get vsReserved => 'Reservada';

  @override
  String get vsPaused => 'Pausada';

  @override
  String get vsBlocked => 'Bloqueada';

  @override
  String get vsMaintenance => 'Manutenção';

  @override
  String get vsOffline => 'Sem sinal';

  @override
  String get vsAwaitingPickup => 'Para recolher';

  @override
  String get vsOther => 'Outro status';

  @override
  String get stockTitle => 'Estoque de baterias';

  @override
  String get stockError => 'Não foi possível carregar as baterias.';

  @override
  String get stockEmpty => 'Nenhuma bateria com este status.';

  @override
  String get stockFilterAll => 'Todas';

  @override
  String stockCountSemantics(String status, int count) {
    return '$status: $count';
  }

  @override
  String stockOnVehicle(String code) {
    return 'Na moto $code';
  }

  @override
  String stockItemSemantics(
    String serial,
    String status,
    int pct,
    String cycles,
  ) {
    return '$serial, $status, carga $pct%, $cycles';
  }

  @override
  String get bsInVehicle => 'Na moto';

  @override
  String get bsInVan => 'Na van';

  @override
  String get bsCharging => 'Galpão (recarga)';

  @override
  String get bsInStation => 'Na estação';

  @override
  String get bsRetired => 'Aposentada';

  @override
  String get bsOther => 'Outro status';

  @override
  String unloadTitle(String serial) {
    return 'Descarregar $serial';
  }

  @override
  String get unloadWarehouse => 'Galpão (recarga)';

  @override
  String get unloadWarehouseHint => 'A bateria fica no galpão para recarregar.';

  @override
  String get unloadStations => 'Estações de troca';

  @override
  String unloadStationHint(int count, String address) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count carregadas',
      one: '1 carregada',
      zero: 'Nenhuma carregada',
    );
    return '$_temp0 · $address';
  }

  @override
  String get unloadStationsError =>
      'Não foi possível carregar as estações. Você ainda pode descarregar no galpão.';

  @override
  String unloadedStation(String name) {
    return 'Bateria descarregada na estação $name.';
  }
}
