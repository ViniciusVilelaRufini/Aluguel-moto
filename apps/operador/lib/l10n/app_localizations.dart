import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('pt')];

  /// No description provided for @appTitle.
  ///
  /// In pt, this message translates to:
  /// **'Volti Campo'**
  String get appTitle;

  /// No description provided for @loginTitle.
  ///
  /// In pt, this message translates to:
  /// **'Entrar'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Operador de campo'**
  String get loginSubtitle;

  /// No description provided for @loginEmail.
  ///
  /// In pt, this message translates to:
  /// **'E-mail'**
  String get loginEmail;

  /// No description provided for @loginAction.
  ///
  /// In pt, this message translates to:
  /// **'Entrar'**
  String get loginAction;

  /// No description provided for @loginError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível entrar. Verifique a conexão e tente de novo.'**
  String get loginError;

  /// No description provided for @loginCognitoUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'O login pelo Cognito ainda não está disponível neste ambiente.'**
  String get loginCognitoUnavailable;

  /// No description provided for @signOut.
  ///
  /// In pt, this message translates to:
  /// **'Sair'**
  String get signOut;

  /// No description provided for @headerRole.
  ///
  /// In pt, this message translates to:
  /// **'Operador de campo'**
  String get headerRole;

  /// No description provided for @greeting.
  ///
  /// In pt, this message translates to:
  /// **'Olá, {name}'**
  String greeting(String name);

  /// No description provided for @statPending.
  ///
  /// In pt, this message translates to:
  /// **'Pendentes'**
  String get statPending;

  /// No description provided for @statDone.
  ///
  /// In pt, this message translates to:
  /// **'Concluídas'**
  String get statDone;

  /// No description provided for @statQueue.
  ///
  /// In pt, this message translates to:
  /// **'Na fila'**
  String get statQueue;

  /// No description provided for @tabToday.
  ///
  /// In pt, this message translates to:
  /// **'Hoje'**
  String get tabToday;

  /// No description provided for @tabDone.
  ///
  /// In pt, this message translates to:
  /// **'Concluídas'**
  String get tabDone;

  /// No description provided for @viewList.
  ///
  /// In pt, this message translates to:
  /// **'Lista'**
  String get viewList;

  /// No description provided for @viewMap.
  ///
  /// In pt, this message translates to:
  /// **'Mapa'**
  String get viewMap;

  /// No description provided for @emptyTasks.
  ///
  /// In pt, this message translates to:
  /// **'Nada por aqui.'**
  String get emptyTasks;

  /// No description provided for @offlineCache.
  ///
  /// In pt, this message translates to:
  /// **'Sem rede. Mostrando as últimas tarefas salvas.'**
  String get offlineCache;

  /// No description provided for @tasksError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível carregar as tarefas.'**
  String get tasksError;

  /// No description provided for @retry.
  ///
  /// In pt, this message translates to:
  /// **'Tentar de novo'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In pt, this message translates to:
  /// **'Fechar'**
  String get close;

  /// No description provided for @errorGeneric.
  ///
  /// In pt, this message translates to:
  /// **'Algo deu errado. Tente de novo.'**
  String get errorGeneric;

  /// No description provided for @offlineAction.
  ///
  /// In pt, this message translates to:
  /// **'Sem rede. Tente de novo quando a conexão voltar.'**
  String get offlineAction;

  /// No description provided for @back.
  ///
  /// In pt, this message translates to:
  /// **'Voltar'**
  String get back;

  /// No description provided for @typeCollect.
  ///
  /// In pt, this message translates to:
  /// **'Recolher moto'**
  String get typeCollect;

  /// No description provided for @typeBatterySwap.
  ///
  /// In pt, this message translates to:
  /// **'Trocar bateria'**
  String get typeBatterySwap;

  /// No description provided for @typeMaintenance.
  ///
  /// In pt, this message translates to:
  /// **'Levar para manutenção'**
  String get typeMaintenance;

  /// No description provided for @typeReposition.
  ///
  /// In pt, this message translates to:
  /// **'Reposicionar'**
  String get typeReposition;

  /// No description provided for @typeInspection.
  ///
  /// In pt, this message translates to:
  /// **'Inspecionar moto'**
  String get typeInspection;

  /// No description provided for @priorityLow.
  ///
  /// In pt, this message translates to:
  /// **'Baixa'**
  String get priorityLow;

  /// No description provided for @priorityMedium.
  ///
  /// In pt, this message translates to:
  /// **'Média'**
  String get priorityMedium;

  /// No description provided for @priorityHigh.
  ///
  /// In pt, this message translates to:
  /// **'Alta'**
  String get priorityHigh;

  /// No description provided for @priorityUrgent.
  ///
  /// In pt, this message translates to:
  /// **'Urgente'**
  String get priorityUrgent;

  /// No description provided for @taskDetailTitle.
  ///
  /// In pt, this message translates to:
  /// **'Tarefa'**
  String get taskDetailTitle;

  /// No description provided for @taskNotFound.
  ///
  /// In pt, this message translates to:
  /// **'Tarefa não encontrada.'**
  String get taskNotFound;

  /// No description provided for @actionStart.
  ///
  /// In pt, this message translates to:
  /// **'Iniciar tarefa'**
  String get actionStart;

  /// No description provided for @actionRoute.
  ///
  /// In pt, this message translates to:
  /// **'Traçar rota'**
  String get actionRoute;

  /// No description provided for @actionServiceUnlock.
  ///
  /// In pt, this message translates to:
  /// **'Destravar em modo serviço'**
  String get actionServiceUnlock;

  /// No description provided for @serviceUnlockActive.
  ///
  /// In pt, this message translates to:
  /// **'Modo serviço ativo'**
  String get serviceUnlockActive;

  /// No description provided for @serviceUnlockActiveBody.
  ///
  /// In pt, this message translates to:
  /// **'Sem cobrança. O destravamento fica registrado na auditoria.'**
  String get serviceUnlockActiveBody;

  /// No description provided for @serviceUnlockReason.
  ///
  /// In pt, this message translates to:
  /// **'Serviço de campo'**
  String get serviceUnlockReason;

  /// No description provided for @actionChecklist.
  ///
  /// In pt, this message translates to:
  /// **'Checklist de inspeção'**
  String get actionChecklist;

  /// No description provided for @actionBatterySwap.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria'**
  String get actionBatterySwap;

  /// No description provided for @actionSetStatus.
  ///
  /// In pt, this message translates to:
  /// **'Mudar status da moto'**
  String get actionSetStatus;

  /// No description provided for @actionComplete.
  ///
  /// In pt, this message translates to:
  /// **'Concluir tarefa'**
  String get actionComplete;

  /// No description provided for @sectionRegistered.
  ///
  /// In pt, this message translates to:
  /// **'Registrado'**
  String get sectionRegistered;

  /// No description provided for @targetLabel.
  ///
  /// In pt, this message translates to:
  /// **'Destino do reposicionamento'**
  String get targetLabel;

  /// No description provided for @distanceToTarget.
  ///
  /// In pt, this message translates to:
  /// **'{km} km até o destino'**
  String distanceToTarget(String km);

  /// No description provided for @completeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Concluir tarefa'**
  String get completeTitle;

  /// No description provided for @completeNotes.
  ///
  /// In pt, this message translates to:
  /// **'Observações'**
  String get completeNotes;

  /// No description provided for @completeVehicleStatus.
  ///
  /// In pt, this message translates to:
  /// **'Status da moto ao concluir'**
  String get completeVehicleStatus;

  /// No description provided for @keepStatus.
  ///
  /// In pt, this message translates to:
  /// **'Manter'**
  String get keepStatus;

  /// No description provided for @statusAvailable.
  ///
  /// In pt, this message translates to:
  /// **'Disponível'**
  String get statusAvailable;

  /// No description provided for @statusMaintenance.
  ///
  /// In pt, this message translates to:
  /// **'Manutenção'**
  String get statusMaintenance;

  /// No description provided for @completeConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Concluir'**
  String get completeConfirm;

  /// No description provided for @completeRequires.
  ///
  /// In pt, this message translates to:
  /// **'Antes de concluir, registre: {what}.'**
  String completeRequires(String what);

  /// No description provided for @taskCompleted.
  ///
  /// In pt, this message translates to:
  /// **'Tarefa concluída.'**
  String get taskCompleted;

  /// No description provided for @taskCompletePending.
  ///
  /// In pt, this message translates to:
  /// **'Conclusão salva. Aguardando sincronização.'**
  String get taskCompletePending;

  /// No description provided for @statusSheetTitle.
  ///
  /// In pt, this message translates to:
  /// **'Mudar status da moto'**
  String get statusSheetTitle;

  /// No description provided for @statusReason.
  ///
  /// In pt, this message translates to:
  /// **'Motivo'**
  String get statusReason;

  /// No description provided for @statusReasonTooShort.
  ///
  /// In pt, this message translates to:
  /// **'Informe o motivo (mínimo de 3 caracteres).'**
  String get statusReasonTooShort;

  /// No description provided for @statusChanged.
  ///
  /// In pt, this message translates to:
  /// **'Status da moto atualizado.'**
  String get statusChanged;

  /// No description provided for @statusConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Atualizar status'**
  String get statusConfirm;

  /// No description provided for @inspectionTitle.
  ///
  /// In pt, this message translates to:
  /// **'Checklist de inspeção'**
  String get inspectionTitle;

  /// No description provided for @itemBrakes.
  ///
  /// In pt, this message translates to:
  /// **'Freio dianteiro e traseiro'**
  String get itemBrakes;

  /// No description provided for @itemTires.
  ///
  /// In pt, this message translates to:
  /// **'Pneus'**
  String get itemTires;

  /// No description provided for @itemLights.
  ///
  /// In pt, this message translates to:
  /// **'Luzes'**
  String get itemLights;

  /// No description provided for @itemBell.
  ///
  /// In pt, this message translates to:
  /// **'Campainha'**
  String get itemBell;

  /// No description provided for @itemSpeed.
  ///
  /// In pt, this message translates to:
  /// **'Limitador de velocidade'**
  String get itemSpeed;

  /// No description provided for @answerOk.
  ///
  /// In pt, this message translates to:
  /// **'Ok'**
  String get answerOk;

  /// No description provided for @answerProblem.
  ///
  /// In pt, this message translates to:
  /// **'Com problema'**
  String get answerProblem;

  /// No description provided for @speedReadingLabel.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade máxima lida no controlador (km/h)'**
  String get speedReadingLabel;

  /// No description provided for @speedReadingHelp.
  ///
  /// In pt, this message translates to:
  /// **'Leitura de 0 a 100. Acima de 32 km/h a moto está fora do limite legal.'**
  String get speedReadingHelp;

  /// No description provided for @speedReadingInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Informe um valor de 0 a 100.'**
  String get speedReadingInvalid;

  /// No description provided for @speedNonCompliant.
  ///
  /// In pt, this message translates to:
  /// **'Moto fora do limite legal — vai para manutenção'**
  String get speedNonCompliant;

  /// No description provided for @itemsCounter.
  ///
  /// In pt, this message translates to:
  /// **'{done}/{total}'**
  String itemsCounter(int done, int total);

  /// No description provided for @photoLabel.
  ///
  /// In pt, this message translates to:
  /// **'Foto da moto'**
  String get photoLabel;

  /// No description provided for @photoHint.
  ///
  /// In pt, this message translates to:
  /// **'Obrigatória'**
  String get photoHint;

  /// No description provided for @photoAdd.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar foto'**
  String get photoAdd;

  /// No description provided for @photoCount.
  ///
  /// In pt, this message translates to:
  /// **'{n} foto(s) anexada(s)'**
  String photoCount(int n);

  /// No description provided for @notesLabel.
  ///
  /// In pt, this message translates to:
  /// **'Observações'**
  String get notesLabel;

  /// No description provided for @submitInspection.
  ///
  /// In pt, this message translates to:
  /// **'Enviar checklist'**
  String get submitInspection;

  /// No description provided for @inspectionSent.
  ///
  /// In pt, this message translates to:
  /// **'Checklist enviado.'**
  String get inspectionSent;

  /// No description provided for @inspectionQueued.
  ///
  /// In pt, this message translates to:
  /// **'Checklist salvo. Aguardando sincronização.'**
  String get inspectionQueued;

  /// No description provided for @maintenanceOpened.
  ///
  /// In pt, this message translates to:
  /// **'Manutenção aberta (tarefa {taskId}) e alerta registrado ({alertId}). A moto foi para manutenção.'**
  String maintenanceOpened(String taskId, String alertId);

  /// No description provided for @awaitingSync.
  ///
  /// In pt, this message translates to:
  /// **'Aguardando sincronização'**
  String get awaitingSync;

  /// No description provided for @batteryTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria'**
  String get batteryTitle;

  /// No description provided for @batteryRemoved.
  ///
  /// In pt, this message translates to:
  /// **'Bateria retirada'**
  String get batteryRemoved;

  /// No description provided for @batteryInstalled.
  ///
  /// In pt, this message translates to:
  /// **'Bateria instalada'**
  String get batteryInstalled;

  /// No description provided for @serialHint.
  ///
  /// In pt, this message translates to:
  /// **'Número de série'**
  String get serialHint;

  /// No description provided for @scanAction.
  ///
  /// In pt, this message translates to:
  /// **'Ler QR ou código de barras'**
  String get scanAction;

  /// No description provided for @scanTitle.
  ///
  /// In pt, this message translates to:
  /// **'Aponte para o QR ou código de barras'**
  String get scanTitle;

  /// No description provided for @scanCameraError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir a câmera. Digite o número de série.'**
  String get scanCameraError;

  /// No description provided for @serialsMustDiffer.
  ///
  /// In pt, this message translates to:
  /// **'Os números de série precisam ser diferentes.'**
  String get serialsMustDiffer;

  /// No description provided for @serialTooShort.
  ///
  /// In pt, this message translates to:
  /// **'Mínimo de 3 caracteres.'**
  String get serialTooShort;

  /// No description provided for @submitSwap.
  ///
  /// In pt, this message translates to:
  /// **'Registrar troca'**
  String get submitSwap;

  /// No description provided for @swapSent.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria registrada.'**
  String get swapSent;

  /// No description provided for @swapQueued.
  ///
  /// In pt, this message translates to:
  /// **'Troca salva. Aguardando sincronização.'**
  String get swapQueued;

  /// No description provided for @syncTitle.
  ///
  /// In pt, this message translates to:
  /// **'Pendências de envio'**
  String get syncTitle;

  /// No description provided for @syncEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Tudo sincronizado.'**
  String get syncEmpty;

  /// No description provided for @syncNow.
  ///
  /// In pt, this message translates to:
  /// **'Sincronizar agora'**
  String get syncNow;

  /// No description provided for @jobInspection.
  ///
  /// In pt, this message translates to:
  /// **'Checklist de inspeção'**
  String get jobInspection;

  /// No description provided for @jobBatterySwap.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria'**
  String get jobBatterySwap;

  /// No description provided for @jobCompleteTask.
  ///
  /// In pt, this message translates to:
  /// **'Conclusão de tarefa'**
  String get jobCompleteTask;

  /// No description provided for @jobFailed.
  ///
  /// In pt, this message translates to:
  /// **'Recusado: {reason}'**
  String jobFailed(String reason);

  /// No description provided for @discard.
  ///
  /// In pt, this message translates to:
  /// **'Descartar'**
  String get discard;

  /// No description provided for @loginCognitoAction.
  ///
  /// In pt, this message translates to:
  /// **'Entrar com a conta Volti'**
  String get loginCognitoAction;

  /// No description provided for @loginCognitoHint.
  ///
  /// In pt, this message translates to:
  /// **'Você entra pela página segura da Volti. O código de verificação (MFA) é pedido lá.'**
  String get loginCognitoHint;

  /// No description provided for @loginCampoRequired.
  ///
  /// In pt, this message translates to:
  /// **'Sua conta não tem acesso ao app de campo. Fale com a operação.'**
  String get loginCampoRequired;

  /// No description provided for @loginCognitoMissing.
  ///
  /// In pt, this message translates to:
  /// **'Login Cognito não configurado neste build (faltam: {names}).'**
  String loginCognitoMissing(String names);

  /// No description provided for @accountTitle.
  ///
  /// In pt, this message translates to:
  /// **'Conta'**
  String get accountTitle;

  /// No description provided for @accountMenu.
  ///
  /// In pt, this message translates to:
  /// **'Conta e pendências'**
  String get accountMenu;

  /// No description provided for @prioritySemantics.
  ///
  /// In pt, this message translates to:
  /// **'Prioridade {priority}'**
  String prioritySemantics(String priority);

  /// No description provided for @distanceSemantics.
  ///
  /// In pt, this message translates to:
  /// **'A {distance} de você'**
  String distanceSemantics(String distance);

  /// No description provided for @dueLate.
  ///
  /// In pt, this message translates to:
  /// **'Atrasada'**
  String get dueLate;

  /// No description provided for @dueAt.
  ///
  /// In pt, this message translates to:
  /// **'Até {time}'**
  String dueAt(String time);

  /// No description provided for @doneAt.
  ///
  /// In pt, this message translates to:
  /// **'Concluída às {time}'**
  String doneAt(String time);

  /// No description provided for @locationRationaleTitle.
  ///
  /// In pt, this message translates to:
  /// **'Ative a localização'**
  String get locationRationaleTitle;

  /// No description provided for @locationRationaleBody.
  ///
  /// In pt, this message translates to:
  /// **'Usamos sua localização só com o app aberto, para mostrar a distância até cada moto e o seu ponto no mapa.'**
  String get locationRationaleBody;

  /// No description provided for @locationAllow.
  ///
  /// In pt, this message translates to:
  /// **'Permitir localização'**
  String get locationAllow;

  /// No description provided for @locationDeniedBody.
  ///
  /// In pt, this message translates to:
  /// **'A localização está bloqueada para o app. Libere nos ajustes para ver a distância até as motos.'**
  String get locationDeniedBody;

  /// No description provided for @locationServiceOff.
  ///
  /// In pt, this message translates to:
  /// **'O GPS está desligado. Ligue para ver a distância até as motos.'**
  String get locationServiceOff;

  /// No description provided for @locationOpenSettings.
  ///
  /// In pt, this message translates to:
  /// **'Abrir ajustes'**
  String get locationOpenSettings;

  /// No description provided for @notNow.
  ///
  /// In pt, this message translates to:
  /// **'Agora não'**
  String get notNow;

  /// No description provided for @offlineTitle.
  ///
  /// In pt, this message translates to:
  /// **'Sem conexão'**
  String get offlineTitle;

  /// No description provided for @offlineBody.
  ///
  /// In pt, this message translates to:
  /// **'O que você registrar fica salvo e é enviado quando a rede voltar.'**
  String get offlineBody;

  /// No description provided for @loadingTasks.
  ///
  /// In pt, this message translates to:
  /// **'Carregando tarefas'**
  String get loadingTasks;

  /// No description provided for @openTask.
  ///
  /// In pt, this message translates to:
  /// **'Abrir tarefa'**
  String get openTask;

  /// No description provided for @noVehiclePosition.
  ///
  /// In pt, this message translates to:
  /// **'Moto sem posição conhecida'**
  String get noVehiclePosition;

  /// No description provided for @yourLocation.
  ///
  /// In pt, this message translates to:
  /// **'Você está aqui'**
  String get yourLocation;

  /// No description provided for @batteryRegister.
  ///
  /// In pt, this message translates to:
  /// **'Registrar troca'**
  String get batteryRegister;

  /// No description provided for @batteryInstalledSummary.
  ///
  /// In pt, this message translates to:
  /// **'Instalada: {serial}'**
  String batteryInstalledSummary(String serial);

  /// No description provided for @checklistOpen.
  ///
  /// In pt, this message translates to:
  /// **'Abrir checklist'**
  String get checklistOpen;

  /// No description provided for @checklistItemOk.
  ///
  /// In pt, this message translates to:
  /// **'{item}: ok'**
  String checklistItemOk(String item);

  /// No description provided for @checklistItemProblem.
  ///
  /// In pt, this message translates to:
  /// **'{item}: com problema'**
  String checklistItemProblem(String item);

  /// No description provided for @checklistItemPending.
  ///
  /// In pt, this message translates to:
  /// **'{item}: não respondido'**
  String checklistItemPending(String item);

  /// No description provided for @photoAfterService.
  ///
  /// In pt, this message translates to:
  /// **'Foto da moto após o serviço'**
  String get photoAfterService;

  /// No description provided for @photoAddMore.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar outra foto'**
  String get photoAddMore;

  /// No description provided for @photoThumb.
  ///
  /// In pt, this message translates to:
  /// **'Foto {n}'**
  String photoThumb(int n);

  /// No description provided for @photoRemove.
  ///
  /// In pt, this message translates to:
  /// **'Remover foto {n}'**
  String photoRemove(int n);

  /// No description provided for @completeHint.
  ///
  /// In pt, this message translates to:
  /// **'Para concluir: {items}.'**
  String completeHint(String items);

  /// No description provided for @blockerServiceUnlock.
  ///
  /// In pt, this message translates to:
  /// **'destrave em modo serviço'**
  String get blockerServiceUnlock;

  /// No description provided for @blockerChecklist.
  ///
  /// In pt, this message translates to:
  /// **'complete o checklist'**
  String get blockerChecklist;

  /// No description provided for @blockerPhoto.
  ///
  /// In pt, this message translates to:
  /// **'tire a foto da moto'**
  String get blockerPhoto;

  /// No description provided for @blockerBatterySwap.
  ///
  /// In pt, this message translates to:
  /// **'registre a troca de bateria'**
  String get blockerBatterySwap;

  /// No description provided for @taskDoneTitle.
  ///
  /// In pt, this message translates to:
  /// **'Tarefa concluída'**
  String get taskDoneTitle;

  /// No description provided for @completionNotesLabel.
  ///
  /// In pt, this message translates to:
  /// **'Observações da conclusão'**
  String get completionNotesLabel;

  /// No description provided for @serialNewLabel.
  ///
  /// In pt, this message translates to:
  /// **'Nº de série da bateria nova'**
  String get serialNewLabel;

  /// No description provided for @serialRemovedLabel.
  ///
  /// In pt, this message translates to:
  /// **'Nº de série da bateria retirada'**
  String get serialRemovedLabel;

  /// No description provided for @serialPlaceholder.
  ///
  /// In pt, this message translates to:
  /// **'BT-000000'**
  String get serialPlaceholder;

  /// No description provided for @scanTorch.
  ///
  /// In pt, this message translates to:
  /// **'Lanterna'**
  String get scanTorch;

  /// No description provided for @scanManual.
  ///
  /// In pt, this message translates to:
  /// **'Digitar o número'**
  String get scanManual;

  /// No description provided for @scanAimHint.
  ///
  /// In pt, this message translates to:
  /// **'Centralize o código na moldura'**
  String get scanAimHint;

  /// No description provided for @vehicleStatusLabel.
  ///
  /// In pt, this message translates to:
  /// **'Status da moto: {status}'**
  String vehicleStatusLabel(String status);

  /// No description provided for @rejectedHint.
  ///
  /// In pt, this message translates to:
  /// **'Corrija e reenvie em \"Pendências de envio\" para concluir a tarefa.'**
  String get rejectedHint;

  /// No description provided for @statVan.
  ///
  /// In pt, this message translates to:
  /// **'Baterias na van'**
  String get statVan;

  /// No description provided for @statUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'indisponível'**
  String get statUnavailable;

  /// No description provided for @targetAddressLine.
  ///
  /// In pt, this message translates to:
  /// **'Para: {address}'**
  String targetAddressLine(String address);

  /// No description provided for @cyclesCount.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =1{1 ciclo} other{{count} ciclos}}'**
  String cyclesCount(int count);

  /// No description provided for @removedBatteryLine.
  ///
  /// In pt, this message translates to:
  /// **'Retirada: {details}'**
  String removedBatteryLine(String details);

  /// No description provided for @installedBatteryLine.
  ///
  /// In pt, this message translates to:
  /// **'Instalada: {details}'**
  String installedBatteryLine(String details);

  /// No description provided for @vanTitle.
  ///
  /// In pt, this message translates to:
  /// **'Baterias na van'**
  String get vanTitle;

  /// No description provided for @vanCharged.
  ///
  /// In pt, this message translates to:
  /// **'Carregadas'**
  String get vanCharged;

  /// No description provided for @vanDepleted.
  ///
  /// In pt, this message translates to:
  /// **'Descarregadas'**
  String get vanDepleted;

  /// No description provided for @vanTotal.
  ///
  /// In pt, this message translates to:
  /// **'Total'**
  String get vanTotal;

  /// No description provided for @vanEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma bateria na van.'**
  String get vanEmpty;

  /// No description provided for @vanError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível carregar o estoque da van.'**
  String get vanError;

  /// No description provided for @vanOnlineHint.
  ///
  /// In pt, this message translates to:
  /// **'Carregar e descarregar a van exige conexão.'**
  String get vanOnlineHint;

  /// No description provided for @vanLoad.
  ///
  /// In pt, this message translates to:
  /// **'Carregar baterias'**
  String get vanLoad;

  /// No description provided for @vanLoadTitle.
  ///
  /// In pt, this message translates to:
  /// **'Carregar na van'**
  String get vanLoadTitle;

  /// No description provided for @vanLoadSerial.
  ///
  /// In pt, this message translates to:
  /// **'Nº de série da bateria'**
  String get vanLoadSerial;

  /// No description provided for @vanLoadAdd.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar'**
  String get vanLoadAdd;

  /// No description provided for @vanLoadRemove.
  ///
  /// In pt, this message translates to:
  /// **'Tirar {serial} da lista'**
  String vanLoadRemove(String serial);

  /// No description provided for @vanLoadConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Carregar {count, plural, =1{1 bateria} other{{count} baterias}}'**
  String vanLoadConfirm(int count);

  /// No description provided for @vanLoadDuplicate.
  ///
  /// In pt, this message translates to:
  /// **'Essa série já está na lista.'**
  String get vanLoadDuplicate;

  /// No description provided for @vanLoaded.
  ///
  /// In pt, this message translates to:
  /// **'Baterias carregadas na van.'**
  String get vanLoaded;

  /// No description provided for @vanUnload.
  ///
  /// In pt, this message translates to:
  /// **'Descarregar para recarga'**
  String get vanUnload;

  /// No description provided for @vanUnloadSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Descarregar {serial} para recarga'**
  String vanUnloadSemantics(String serial);

  /// No description provided for @vanUnloaded.
  ///
  /// In pt, this message translates to:
  /// **'Bateria descarregada para recarga.'**
  String get vanUnloaded;

  /// No description provided for @vanBatterySemantics.
  ///
  /// In pt, this message translates to:
  /// **'Bateria {serial}, {pct} por cento, {cycles}'**
  String vanBatterySemantics(String serial, int pct, String cycles);

  /// No description provided for @vanSuggestions.
  ///
  /// In pt, this message translates to:
  /// **'Carregadas na van'**
  String get vanSuggestions;

  /// No description provided for @vanPickSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Usar a bateria {serial}'**
  String vanPickSemantics(String serial);

  /// No description provided for @fleetServiceTitle.
  ///
  /// In pt, this message translates to:
  /// **'Revisões da frota'**
  String get fleetServiceTitle;

  /// No description provided for @filterAll.
  ///
  /// In pt, this message translates to:
  /// **'Todas'**
  String get filterAll;

  /// No description provided for @filterOverdue.
  ///
  /// In pt, this message translates to:
  /// **'Vencidas'**
  String get filterOverdue;

  /// No description provided for @filterDueSoon.
  ///
  /// In pt, this message translates to:
  /// **'Próximas'**
  String get filterDueSoon;

  /// No description provided for @serviceOk.
  ///
  /// In pt, this message translates to:
  /// **'Em dia'**
  String get serviceOk;

  /// No description provided for @serviceDueSoon.
  ///
  /// In pt, this message translates to:
  /// **'Próxima'**
  String get serviceDueSoon;

  /// No description provided for @serviceOverdue.
  ///
  /// In pt, this message translates to:
  /// **'Vencida'**
  String get serviceOverdue;

  /// No description provided for @serviceStatusSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Revisão: {status}'**
  String serviceStatusSemantics(String status);

  /// No description provided for @serviceKmSince.
  ///
  /// In pt, this message translates to:
  /// **'{km} desde a revisão'**
  String serviceKmSince(String km);

  /// No description provided for @serviceKmUntil.
  ///
  /// In pt, this message translates to:
  /// **'faltam {km}'**
  String serviceKmUntil(String km);

  /// No description provided for @serviceKmOver.
  ///
  /// In pt, this message translates to:
  /// **'{km} além do previsto'**
  String serviceKmOver(String km);

  /// No description provided for @serviceHours.
  ///
  /// In pt, this message translates to:
  /// **'{hours} h de uso desde a revisão (a cada {interval} h)'**
  String serviceHours(String hours, String interval);

  /// No description provided for @serviceScheduled.
  ///
  /// In pt, this message translates to:
  /// **'Revisão agendada para {date}'**
  String serviceScheduled(String date);

  /// No description provided for @serviceEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma moto nesta situação.'**
  String get serviceEmpty;

  /// No description provided for @serviceError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível carregar as revisões.'**
  String get serviceError;

  /// No description provided for @vehicleCardTitle.
  ///
  /// In pt, this message translates to:
  /// **'Moto'**
  String get vehicleCardTitle;

  /// No description provided for @modelPhotoSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Foto do modelo {name}'**
  String modelPhotoSemantics(String name);

  /// No description provided for @maintenanceCardTitle.
  ///
  /// In pt, this message translates to:
  /// **'Manutenção'**
  String get maintenanceCardTitle;

  /// No description provided for @maintenanceSourceCustomer.
  ///
  /// In pt, this message translates to:
  /// **'Agendada pelo cliente {name}'**
  String maintenanceSourceCustomer(String name);

  /// No description provided for @maintenanceSourceCustomerNoName.
  ///
  /// In pt, this message translates to:
  /// **'Agendada pelo cliente'**
  String get maintenanceSourceCustomerNoName;

  /// No description provided for @maintenanceSourceSystem.
  ///
  /// In pt, this message translates to:
  /// **'Aberta pela inspeção'**
  String get maintenanceSourceSystem;

  /// No description provided for @maintenanceSourceStaff.
  ///
  /// In pt, this message translates to:
  /// **'Aberta pela operação'**
  String get maintenanceSourceStaff;

  /// No description provided for @maintenanceKindPreventive.
  ///
  /// In pt, this message translates to:
  /// **'Preventiva'**
  String get maintenanceKindPreventive;

  /// No description provided for @maintenanceKindCorrective.
  ///
  /// In pt, this message translates to:
  /// **'Corretiva'**
  String get maintenanceKindCorrective;

  /// No description provided for @maintenanceScheduledFor.
  ///
  /// In pt, this message translates to:
  /// **'Agendada para {date}'**
  String maintenanceScheduledFor(String date);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
