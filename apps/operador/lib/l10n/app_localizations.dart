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
