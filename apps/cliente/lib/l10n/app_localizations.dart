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

  /// No description provided for @acceptLocation.
  ///
  /// In pt, this message translates to:
  /// **'Permito o uso da minha localização durante o aluguel'**
  String get acceptLocation;

  /// No description provided for @acceptLocationHint.
  ///
  /// In pt, this message translates to:
  /// **'Só rastreamos sua posição com um aluguel ativo. Você pode revogar quando quiser em Conta.'**
  String get acceptLocationHint;

  /// No description provided for @acceptMarketing.
  ///
  /// In pt, this message translates to:
  /// **'Quero receber novidades e ofertas'**
  String get acceptMarketing;

  /// No description provided for @acceptTerms.
  ///
  /// In pt, this message translates to:
  /// **'Aceito os termos de uso e a política de privacidade'**
  String get acceptTerms;

  /// No description provided for @account.
  ///
  /// In pt, this message translates to:
  /// **'Conta'**
  String get account;

  /// No description provided for @accountNoName.
  ///
  /// In pt, this message translates to:
  /// **'Sua conta'**
  String get accountNoName;

  /// No description provided for @accountTitle.
  ///
  /// In pt, this message translates to:
  /// **'Conta'**
  String get accountTitle;

  /// No description provided for @accumulatedCost.
  ///
  /// In pt, this message translates to:
  /// **'Custo acumulado'**
  String get accumulatedCost;

  /// No description provided for @addCard.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar cartão'**
  String get addCard;

  /// No description provided for @adultOnly.
  ///
  /// In pt, this message translates to:
  /// **'É preciso ter 18 anos ou mais'**
  String get adultOnly;

  /// No description provided for @allowAndContinue.
  ///
  /// In pt, this message translates to:
  /// **'Permitir e continuar'**
  String get allowAndContinue;

  /// No description provided for @apply.
  ///
  /// In pt, this message translates to:
  /// **'Aplicar'**
  String get apply;

  /// No description provided for @back.
  ///
  /// In pt, this message translates to:
  /// **'Voltar'**
  String get back;

  /// No description provided for @backToMap.
  ///
  /// In pt, this message translates to:
  /// **'Voltar ao mapa'**
  String get backToMap;

  /// No description provided for @backToRide.
  ///
  /// In pt, this message translates to:
  /// **'Voltar à corrida'**
  String get backToRide;

  /// No description provided for @badgeAdult.
  ///
  /// In pt, this message translates to:
  /// **'18+'**
  String get badgeAdult;

  /// No description provided for @badgeNoLicense.
  ///
  /// In pt, this message translates to:
  /// **'Sem CNH'**
  String get badgeNoLicense;

  /// No description provided for @badgeNoPlate.
  ///
  /// In pt, this message translates to:
  /// **'Sem placa'**
  String get badgeNoPlate;

  /// No description provided for @battery.
  ///
  /// In pt, this message translates to:
  /// **'Bateria'**
  String get battery;

  /// No description provided for @birthDate.
  ///
  /// In pt, this message translates to:
  /// **'Data de nascimento'**
  String get birthDate;

  /// No description provided for @callSupport.
  ///
  /// In pt, this message translates to:
  /// **'Ligar para o suporte'**
  String get callSupport;

  /// No description provided for @cameraUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir a câmera. Digite o número da moto.'**
  String get cameraUnavailable;

  /// No description provided for @cancel.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar'**
  String get cancel;

  /// No description provided for @checkReturnText.
  ///
  /// In pt, this message translates to:
  /// **'Estacione numa área verde do mapa antes de encerrar.'**
  String get checkReturnText;

  /// No description provided for @checkReturnTitle.
  ///
  /// In pt, this message translates to:
  /// **'Confira o ponto de devolução'**
  String get checkReturnTitle;

  /// No description provided for @chooseInsurance.
  ///
  /// In pt, this message translates to:
  /// **'Escolha o seguro'**
  String get chooseInsurance;

  /// No description provided for @choosePlan.
  ///
  /// In pt, this message translates to:
  /// **'Escolha o plano'**
  String get choosePlan;

  /// No description provided for @claimAccident.
  ///
  /// In pt, this message translates to:
  /// **'Acidente'**
  String get claimAccident;

  /// No description provided for @claimDamage.
  ///
  /// In pt, this message translates to:
  /// **'Dano à moto'**
  String get claimDamage;

  /// No description provided for @claimDescription.
  ///
  /// In pt, this message translates to:
  /// **'Conte o que aconteceu'**
  String get claimDescription;

  /// No description provided for @claimInjury.
  ///
  /// In pt, this message translates to:
  /// **'Lesão pessoal'**
  String get claimInjury;

  /// No description provided for @claimSent.
  ///
  /// In pt, this message translates to:
  /// **'Sinistro enviado. Vamos entrar em contato.'**
  String get claimSent;

  /// No description provided for @claimTheft.
  ///
  /// In pt, this message translates to:
  /// **'Furto'**
  String get claimTheft;

  /// No description provided for @close.
  ///
  /// In pt, this message translates to:
  /// **'Fechar'**
  String get close;

  /// No description provided for @consentLocationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Localização durante o aluguel'**
  String get consentLocationTitle;

  /// No description provided for @continueLabel.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get continueLabel;

  /// No description provided for @continueWithEmail.
  ///
  /// In pt, this message translates to:
  /// **'Entrar com e-mail'**
  String get continueWithEmail;

  /// No description provided for @copyPixCode.
  ///
  /// In pt, this message translates to:
  /// **'Copiar código Pix'**
  String get copyPixCode;

  /// No description provided for @coupon.
  ///
  /// In pt, this message translates to:
  /// **'Cupom'**
  String get coupon;

  /// No description provided for @couponApplied.
  ///
  /// In pt, this message translates to:
  /// **'Cupom aplicado'**
  String get couponApplied;

  /// No description provided for @couponHint.
  ///
  /// In pt, this message translates to:
  /// **'Código do cupom'**
  String get couponHint;

  /// No description provided for @couponInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Cupom inválido ou expirado'**
  String get couponInvalid;

  /// No description provided for @coverage.
  ///
  /// In pt, this message translates to:
  /// **'Seguro'**
  String get coverage;

  /// No description provided for @coverageBasic.
  ///
  /// In pt, this message translates to:
  /// **'Básico'**
  String get coverageBasic;

  /// No description provided for @coverageFull.
  ///
  /// In pt, this message translates to:
  /// **'Completo'**
  String get coverageFull;

  /// No description provided for @cpf.
  ///
  /// In pt, this message translates to:
  /// **'CPF'**
  String get cpf;

  /// No description provided for @dataSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Não pedimos CNH. Só confirmamos que é você.'**
  String get dataSubtitle;

  /// No description provided for @dataTitle.
  ///
  /// In pt, this message translates to:
  /// **'Seus dados'**
  String get dataTitle;

  /// No description provided for @deleteAccount.
  ///
  /// In pt, this message translates to:
  /// **'Excluir minha conta'**
  String get deleteAccount;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Excluir conta'**
  String get deleteAccountConfirm;

  /// No description provided for @deleteAccountText.
  ///
  /// In pt, this message translates to:
  /// **'Seus dados pessoais serão apagados. Aluguéis e pagamentos podem ser mantidos pelo prazo legal.'**
  String get deleteAccountText;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In pt, this message translates to:
  /// **'Excluir conta?'**
  String get deleteAccountTitle;

  /// No description provided for @deposit.
  ///
  /// In pt, this message translates to:
  /// **'Caução'**
  String get deposit;

  /// No description provided for @depositAmount.
  ///
  /// In pt, this message translates to:
  /// **'Caução (devolvida)'**
  String get depositAmount;

  /// No description provided for @depositHint.
  ///
  /// In pt, this message translates to:
  /// **'A caução é liberada quando você encerra a corrida.'**
  String get depositHint;

  /// No description provided for @discount.
  ///
  /// In pt, this message translates to:
  /// **'Desconto'**
  String get discount;

  /// No description provided for @disputeCharge.
  ///
  /// In pt, this message translates to:
  /// **'Contestar cobrança'**
  String get disputeCharge;

  /// No description provided for @disputeHint.
  ///
  /// In pt, this message translates to:
  /// **'Explique o motivo da contestação'**
  String get disputeHint;

  /// No description provided for @disputeSent.
  ///
  /// In pt, this message translates to:
  /// **'Contestação enviada'**
  String get disputeSent;

  /// No description provided for @disputeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Contestar cobrança'**
  String get disputeTitle;

  /// No description provided for @documentPhoto.
  ///
  /// In pt, this message translates to:
  /// **'Foto do documento (RG ou CNH)'**
  String get documentPhoto;

  /// No description provided for @documentPhotoHint.
  ///
  /// In pt, this message translates to:
  /// **'Frente, sem reflexo'**
  String get documentPhotoHint;

  /// No description provided for @duration.
  ///
  /// In pt, this message translates to:
  /// **'Duração'**
  String get duration;

  /// No description provided for @email.
  ///
  /// In pt, this message translates to:
  /// **'E-mail'**
  String get email;

  /// No description provided for @endRide.
  ///
  /// In pt, this message translates to:
  /// **'Encerrar corrida'**
  String get endRide;

  /// No description provided for @endRideText.
  ///
  /// In pt, this message translates to:
  /// **'A moto será travada. Você paga só pelos minutos usados.'**
  String get endRideText;

  /// No description provided for @endRideTitle.
  ///
  /// In pt, this message translates to:
  /// **'Encerrar corrida?'**
  String get endRideTitle;

  /// No description provided for @errorGeneric.
  ///
  /// In pt, this message translates to:
  /// **'Algo deu errado. Tente de novo.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In pt, this message translates to:
  /// **'Sem conexão com a internet. Confira sua rede e tente de novo.'**
  String get errorNetwork;

  /// No description provided for @errorUnauthorized.
  ///
  /// In pt, this message translates to:
  /// **'Sua sessão expirou. Entre de novo.'**
  String get errorUnauthorized;

  /// No description provided for @estimatedTotal.
  ///
  /// In pt, this message translates to:
  /// **'Total estimado'**
  String get estimatedTotal;

  /// No description provided for @exportData.
  ///
  /// In pt, this message translates to:
  /// **'Exportar meus dados'**
  String get exportData;

  /// No description provided for @fees.
  ///
  /// In pt, this message translates to:
  /// **'Taxas'**
  String get fees;

  /// No description provided for @filterBattery.
  ///
  /// In pt, this message translates to:
  /// **'Bateria acima de 50%'**
  String get filterBattery;

  /// No description provided for @fullName.
  ///
  /// In pt, this message translates to:
  /// **'Nome completo'**
  String get fullName;

  /// No description provided for @fullNameHint.
  ///
  /// In pt, this message translates to:
  /// **'Como no documento'**
  String get fullNameHint;

  /// No description provided for @goToMap.
  ///
  /// In pt, this message translates to:
  /// **'Ir para o mapa'**
  String get goToMap;

  /// No description provided for @helpCenter.
  ///
  /// In pt, this message translates to:
  /// **'Central de ajuda'**
  String get helpCenter;

  /// No description provided for @helpIntro.
  ///
  /// In pt, this message translates to:
  /// **'Sua moto é um equipamento autopropelido: até 32 km/h, sem placa e sem CNH. Veja as regras para andar com segurança.'**
  String get helpIntro;

  /// No description provided for @helpRule1Title.
  ///
  /// In pt, this message translates to:
  /// **'Onde posso andar'**
  String get helpRule1Title;

  /// No description provided for @helpRule1Text.
  ///
  /// In pt, this message translates to:
  /// **'Ciclovias, ciclofaixas e vias de baixa velocidade. Em calçadas e áreas de pedestres a moto reduz para 6 km/h sozinha.'**
  String get helpRule1Text;

  /// No description provided for @helpRule2Title.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade máxima'**
  String get helpRule2Title;

  /// No description provided for @helpRule2Text.
  ///
  /// In pt, this message translates to:
  /// **'A moto nunca passa de 32 km/h. Em ciclovias o limite é 20 km/h.'**
  String get helpRule2Text;

  /// No description provided for @helpRule3Title.
  ///
  /// In pt, this message translates to:
  /// **'Capacete e equipamentos'**
  String get helpRule3Title;

  /// No description provided for @helpRule3Text.
  ///
  /// In pt, this message translates to:
  /// **'Use capacete, respeite semáforos e sinalização e não ande em duas pessoas.'**
  String get helpRule3Text;

  /// No description provided for @helpRule4Title.
  ///
  /// In pt, this message translates to:
  /// **'Onde estacionar'**
  String get helpRule4Title;

  /// No description provided for @helpRule4Text.
  ///
  /// In pt, this message translates to:
  /// **'Só encerre a corrida em pontos de devolução (áreas verdes no mapa), sem atrapalhar a calçada.'**
  String get helpRule4Text;

  /// No description provided for @helpRule5Title.
  ///
  /// In pt, this message translates to:
  /// **'Em caso de queda ou emergência'**
  String get helpRule5Title;

  /// No description provided for @helpRule5Text.
  ///
  /// In pt, this message translates to:
  /// **'Toque em SOS na tela da corrida para ligar para o suporte ou compartilhar sua localização com um contato.'**
  String get helpRule5Text;

  /// No description provided for @history.
  ///
  /// In pt, this message translates to:
  /// **'Histórico'**
  String get history;

  /// No description provided for @historyEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Você ainda não fez nenhuma corrida.'**
  String get historyEmpty;

  /// No description provided for @imFine.
  ///
  /// In pt, this message translates to:
  /// **'Estou bem'**
  String get imFine;

  /// No description provided for @included.
  ///
  /// In pt, this message translates to:
  /// **'Incluído'**
  String get included;

  /// No description provided for @insideReturnText.
  ///
  /// In pt, this message translates to:
  /// **'Você pode encerrar a corrida aqui.'**
  String get insideReturnText;

  /// No description provided for @insideReturnTitle.
  ///
  /// In pt, this message translates to:
  /// **'Ponto de devolução'**
  String get insideReturnTitle;

  /// No description provided for @insurance.
  ///
  /// In pt, this message translates to:
  /// **'Seguro'**
  String get insurance;

  /// No description provided for @kycApprovedShort.
  ///
  /// In pt, this message translates to:
  /// **'Aprovada'**
  String get kycApprovedShort;

  /// No description provided for @kycApprovedText.
  ///
  /// In pt, this message translates to:
  /// **'Sua identidade foi confirmada. Já dá para andar.'**
  String get kycApprovedText;

  /// No description provided for @kycApprovedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Tudo certo'**
  String get kycApprovedTitle;

  /// No description provided for @kycHomeNotice.
  ///
  /// In pt, this message translates to:
  /// **'Você pode reservar depois da aprovação. Toque para ver o status.'**
  String get kycHomeNotice;

  /// No description provided for @kycPendingShort.
  ///
  /// In pt, this message translates to:
  /// **'Em análise'**
  String get kycPendingShort;

  /// No description provided for @kycPendingText.
  ///
  /// In pt, this message translates to:
  /// **'Estamos conferindo seus documentos. Avisamos assim que terminar.'**
  String get kycPendingText;

  /// No description provided for @kycPendingTitle.
  ///
  /// In pt, this message translates to:
  /// **'Verificação em análise'**
  String get kycPendingTitle;

  /// No description provided for @kycPrivacy.
  ///
  /// In pt, this message translates to:
  /// **'Seus documentos ficam criptografados e servem só para verificação.'**
  String get kycPrivacy;

  /// No description provided for @kycRejectedShort.
  ///
  /// In pt, this message translates to:
  /// **'Recusada'**
  String get kycRejectedShort;

  /// No description provided for @kycRejectedText.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos confirmar seus dados. Envie novos documentos.'**
  String get kycRejectedText;

  /// No description provided for @kycRejectedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Verificação recusada'**
  String get kycRejectedTitle;

  /// No description provided for @kycSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Foto do documento e uma selfie rápida para comparação facial.'**
  String get kycSubtitle;

  /// No description provided for @kycTitle.
  ///
  /// In pt, this message translates to:
  /// **'Verificação de identidade'**
  String get kycTitle;

  /// No description provided for @liveBadge.
  ///
  /// In pt, this message translates to:
  /// **'Ao vivo'**
  String get liveBadge;

  /// No description provided for @loading.
  ///
  /// In pt, this message translates to:
  /// **'Carregando'**
  String get loading;

  /// No description provided for @locateMe.
  ///
  /// In pt, this message translates to:
  /// **'Minha localização'**
  String get locateMe;

  /// No description provided for @locationConsentText.
  ///
  /// In pt, this message translates to:
  /// **'Para andar, precisamos da sua localização durante o aluguel. Ela só é usada com uma corrida ativa.'**
  String get locationConsentText;

  /// No description provided for @locationConsentTitle.
  ///
  /// In pt, this message translates to:
  /// **'Permitir localização?'**
  String get locationConsentTitle;

  /// No description provided for @lockedBye.
  ///
  /// In pt, this message translates to:
  /// **'Moto travada. Até a próxima!'**
  String get lockedBye;

  /// No description provided for @loginCognitoPending.
  ///
  /// In pt, this message translates to:
  /// **'A entrada pelo Cognito ainda não está configurada neste ambiente.'**
  String get loginCognitoPending;

  /// No description provided for @loginDevHint.
  ///
  /// In pt, this message translates to:
  /// **'Modo de desenvolvimento: informe um e-mail para entrar.'**
  String get loginDevHint;

  /// No description provided for @loginTitle.
  ///
  /// In pt, this message translates to:
  /// **'Entrar'**
  String get loginTitle;

  /// No description provided for @mandatory.
  ///
  /// In pt, this message translates to:
  /// **'Obrigatório'**
  String get mandatory;

  /// No description provided for @message.
  ///
  /// In pt, this message translates to:
  /// **'Mensagem'**
  String get message;

  /// No description provided for @minutePackages.
  ///
  /// In pt, this message translates to:
  /// **'Pacotes de minutos'**
  String get minutePackages;

  /// No description provided for @myPlan.
  ///
  /// In pt, this message translates to:
  /// **'Meu plano'**
  String get myPlan;

  /// No description provided for @nearbyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Motos por perto'**
  String get nearbyTitle;

  /// No description provided for @needHelp.
  ///
  /// In pt, this message translates to:
  /// **'Preciso de ajuda'**
  String get needHelp;

  /// No description provided for @newConversation.
  ///
  /// In pt, this message translates to:
  /// **'Nova conversa'**
  String get newConversation;

  /// No description provided for @noCard.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum cartão salvo'**
  String get noCard;

  /// No description provided for @noKmNotice.
  ///
  /// In pt, this message translates to:
  /// **'Você paga pelo tempo de uso. Não cobramos nem mostramos km rodados.'**
  String get noKmNotice;

  /// No description provided for @noReservation.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma reserva ativa'**
  String get noReservation;

  /// No description provided for @noVehiclesNearby.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma moto por perto agora'**
  String get noVehiclesNearby;

  /// No description provided for @notNow.
  ///
  /// In pt, this message translates to:
  /// **'Agora não'**
  String get notNow;

  /// No description provided for @openClaim.
  ///
  /// In pt, this message translates to:
  /// **'Abrir sinistro'**
  String get openClaim;

  /// No description provided for @outsideReturnText.
  ///
  /// In pt, this message translates to:
  /// **'Estacione numa área verde para encerrar.'**
  String get outsideReturnText;

  /// No description provided for @outsideReturnTitle.
  ///
  /// In pt, this message translates to:
  /// **'Fora do ponto de devolução'**
  String get outsideReturnTitle;

  /// No description provided for @pause.
  ///
  /// In pt, this message translates to:
  /// **'Pausar'**
  String get pause;

  /// No description provided for @pausedBadge.
  ///
  /// In pt, this message translates to:
  /// **'Pausada'**
  String get pausedBadge;

  /// No description provided for @payAndUnlock.
  ///
  /// In pt, this message translates to:
  /// **'Pagar caução e destravar'**
  String get payAndUnlock;

  /// No description provided for @payCard.
  ///
  /// In pt, this message translates to:
  /// **'Cartão de crédito'**
  String get payCard;

  /// No description provided for @payPix.
  ///
  /// In pt, this message translates to:
  /// **'Pix'**
  String get payPix;

  /// No description provided for @payPixHint.
  ///
  /// In pt, this message translates to:
  /// **'Caução por depósito Pix'**
  String get payPixHint;

  /// No description provided for @pixCopied.
  ///
  /// In pt, this message translates to:
  /// **'Código Pix copiado'**
  String get pixCopied;

  /// No description provided for @pixFailed.
  ///
  /// In pt, this message translates to:
  /// **'O Pix não foi concluído. Tente de novo.'**
  String get pixFailed;

  /// No description provided for @pixTitle.
  ///
  /// In pt, this message translates to:
  /// **'Pague com Pix'**
  String get pixTitle;

  /// No description provided for @pixWaiting.
  ///
  /// In pt, this message translates to:
  /// **'Aguardando o pagamento…'**
  String get pixWaiting;

  /// No description provided for @planMonthly.
  ///
  /// In pt, this message translates to:
  /// **'Plano mensal'**
  String get planMonthly;

  /// No description provided for @planTitle.
  ///
  /// In pt, this message translates to:
  /// **'Escolha como andar'**
  String get planTitle;

  /// No description provided for @planWeekly.
  ///
  /// In pt, this message translates to:
  /// **'Plano semanal'**
  String get planWeekly;

  /// No description provided for @privacy.
  ///
  /// In pt, this message translates to:
  /// **'Privacidade e dados'**
  String get privacy;

  /// No description provided for @privacyIntro.
  ///
  /// In pt, this message translates to:
  /// **'Você controla seus dados. Pode exportar uma cópia ou excluir sua conta quando quiser.'**
  String get privacyIntro;

  /// No description provided for @problemBattery.
  ///
  /// In pt, this message translates to:
  /// **'Bateria'**
  String get problemBattery;

  /// No description provided for @problemBrake.
  ///
  /// In pt, this message translates to:
  /// **'Freio'**
  String get problemBrake;

  /// No description provided for @problemLights.
  ///
  /// In pt, this message translates to:
  /// **'Luzes'**
  String get problemLights;

  /// No description provided for @problemOther.
  ///
  /// In pt, this message translates to:
  /// **'Outro'**
  String get problemOther;

  /// No description provided for @problemTire.
  ///
  /// In pt, this message translates to:
  /// **'Pneu'**
  String get problemTire;

  /// No description provided for @rateRide.
  ///
  /// In pt, this message translates to:
  /// **'Como foi a corrida?'**
  String get rateRide;

  /// No description provided for @refreshStatus.
  ///
  /// In pt, this message translates to:
  /// **'Atualizar status'**
  String get refreshStatus;

  /// No description provided for @rentalInProgress.
  ///
  /// In pt, this message translates to:
  /// **'Corrida em andamento'**
  String get rentalInProgress;

  /// No description provided for @reportProblem.
  ///
  /// In pt, this message translates to:
  /// **'Reportar problema'**
  String get reportProblem;

  /// No description provided for @reportSentText.
  ///
  /// In pt, this message translates to:
  /// **'Recebemos o seu relato. Quer trocar de moto sem nova taxa?'**
  String get reportSentText;

  /// No description provided for @reportSentTitle.
  ///
  /// In pt, this message translates to:
  /// **'Problema reportado'**
  String get reportSentTitle;

  /// No description provided for @reportTitle.
  ///
  /// In pt, this message translates to:
  /// **'Qual o problema?'**
  String get reportTitle;

  /// No description provided for @reservationActive.
  ///
  /// In pt, this message translates to:
  /// **'Moto reservada'**
  String get reservationActive;

  /// No description provided for @reservationExpiredText.
  ///
  /// In pt, this message translates to:
  /// **'A moto voltou a ficar disponível. Escolha outra no mapa.'**
  String get reservationExpiredText;

  /// No description provided for @reservationExpiredTitle.
  ///
  /// In pt, this message translates to:
  /// **'Reserva expirada'**
  String get reservationExpiredTitle;

  /// No description provided for @reservationTimeLeft.
  ///
  /// In pt, this message translates to:
  /// **'Tempo de reserva restante'**
  String get reservationTimeLeft;

  /// No description provided for @reserve15.
  ///
  /// In pt, this message translates to:
  /// **'Reservar por 15 min'**
  String get reserve15;

  /// No description provided for @reservedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Moto reservada'**
  String get reservedTitle;

  /// No description provided for @resume.
  ///
  /// In pt, this message translates to:
  /// **'Retomar'**
  String get resume;

  /// No description provided for @retry.
  ///
  /// In pt, this message translates to:
  /// **'Tentar de novo'**
  String get retry;

  /// No description provided for @returnPhoto.
  ///
  /// In pt, this message translates to:
  /// **'Foto da moto estacionada'**
  String get returnPhoto;

  /// No description provided for @returnPhotoHint.
  ///
  /// In pt, this message translates to:
  /// **'Mostre a moto inteira e o entorno'**
  String get returnPhotoHint;

  /// No description provided for @returnPhotoText.
  ///
  /// In pt, this message translates to:
  /// **'Tire uma foto da moto estacionada. Ela é obrigatória para encerrar.'**
  String get returnPhotoText;

  /// No description provided for @returnTitle.
  ///
  /// In pt, this message translates to:
  /// **'Devolver moto'**
  String get returnTitle;

  /// No description provided for @returnVehicle.
  ///
  /// In pt, this message translates to:
  /// **'Devolver moto'**
  String get returnVehicle;

  /// No description provided for @rideLive.
  ///
  /// In pt, this message translates to:
  /// **'Em corrida'**
  String get rideLive;

  /// No description provided for @ridePaused.
  ///
  /// In pt, this message translates to:
  /// **'Moto travada · pausa'**
  String get ridePaused;

  /// No description provided for @rideTitle.
  ///
  /// In pt, this message translates to:
  /// **'Corrida'**
  String get rideTitle;

  /// No description provided for @ringHorn.
  ///
  /// In pt, this message translates to:
  /// **'Piscar e buzinar'**
  String get ringHorn;

  /// No description provided for @ringSent.
  ///
  /// In pt, this message translates to:
  /// **'Sinal enviado. Procure a moto piscando.'**
  String get ringSent;

  /// No description provided for @scanCameraSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Câmera para ler o QR code da moto'**
  String get scanCameraSemantics;

  /// No description provided for @scanHint.
  ///
  /// In pt, this message translates to:
  /// **'Aponte para o QR no guidão ou digite o número da moto.'**
  String get scanHint;

  /// No description provided for @scanTitle.
  ///
  /// In pt, this message translates to:
  /// **'Escanear para andar'**
  String get scanTitle;

  /// No description provided for @scanToRide.
  ///
  /// In pt, this message translates to:
  /// **'Escanear para andar'**
  String get scanToRide;

  /// No description provided for @seeReservation.
  ///
  /// In pt, this message translates to:
  /// **'Ver reserva'**
  String get seeReservation;

  /// No description provided for @selfiePhoto.
  ///
  /// In pt, this message translates to:
  /// **'Selfie com prova de vida'**
  String get selfiePhoto;

  /// No description provided for @selfiePhotoHint.
  ///
  /// In pt, this message translates to:
  /// **'Olhe para a câmera em local iluminado'**
  String get selfiePhotoHint;

  /// No description provided for @send.
  ///
  /// In pt, this message translates to:
  /// **'Enviar'**
  String get send;

  /// No description provided for @sendForReview.
  ///
  /// In pt, this message translates to:
  /// **'Enviar para análise'**
  String get sendForReview;

  /// No description provided for @sendRating.
  ///
  /// In pt, this message translates to:
  /// **'Enviar avaliação'**
  String get sendRating;

  /// No description provided for @sending.
  ///
  /// In pt, this message translates to:
  /// **'Enviando…'**
  String get sending;

  /// No description provided for @shareTrip.
  ///
  /// In pt, this message translates to:
  /// **'Compartilhar trajeto'**
  String get shareTrip;

  /// No description provided for @shareWithContact.
  ///
  /// In pt, this message translates to:
  /// **'Enviar localização a um contato'**
  String get shareWithContact;

  /// No description provided for @signIn.
  ///
  /// In pt, this message translates to:
  /// **'Entrar'**
  String get signIn;

  /// No description provided for @signOut.
  ///
  /// In pt, this message translates to:
  /// **'Sair'**
  String get signOut;

  /// No description provided for @sosText.
  ///
  /// In pt, this message translates to:
  /// **'Sua localização em tempo real é compartilhada enquanto o SOS estiver ativo.'**
  String get sosText;

  /// No description provided for @sosTitle.
  ///
  /// In pt, this message translates to:
  /// **'SOS'**
  String get sosTitle;

  /// No description provided for @subject.
  ///
  /// In pt, this message translates to:
  /// **'Assunto'**
  String get subject;

  /// No description provided for @subscribe.
  ///
  /// In pt, this message translates to:
  /// **'Assinar'**
  String get subscribe;

  /// No description provided for @subscriptionEnding.
  ///
  /// In pt, this message translates to:
  /// **'Termina no fim do período'**
  String get subscriptionEnding;

  /// No description provided for @summary.
  ///
  /// In pt, this message translates to:
  /// **'Resumo'**
  String get summary;

  /// No description provided for @summaryTitle.
  ///
  /// In pt, this message translates to:
  /// **'Recibo'**
  String get summaryTitle;

  /// No description provided for @support.
  ///
  /// In pt, this message translates to:
  /// **'Suporte'**
  String get support;

  /// No description provided for @supportEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma conversa ainda'**
  String get supportEmpty;

  /// No description provided for @swapDone.
  ///
  /// In pt, this message translates to:
  /// **'Moto trocada'**
  String get swapDone;

  /// No description provided for @swapTitle.
  ///
  /// In pt, this message translates to:
  /// **'Trocar de moto'**
  String get swapTitle;

  /// No description provided for @swapVehicle.
  ///
  /// In pt, this message translates to:
  /// **'Trocar de moto'**
  String get swapVehicle;

  /// No description provided for @swipeToCancel.
  ///
  /// In pt, this message translates to:
  /// **'Deslize para cancelar'**
  String get swipeToCancel;

  /// No description provided for @tapToCancel.
  ///
  /// In pt, this message translates to:
  /// **'Toque em um plano para cancelar a renovação.'**
  String get tapToCancel;

  /// No description provided for @thanksRating.
  ///
  /// In pt, this message translates to:
  /// **'Obrigado pela avaliação'**
  String get thanksRating;

  /// No description provided for @total.
  ///
  /// In pt, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @trackingNotificationText.
  ///
  /// In pt, this message translates to:
  /// **'Sua localização é usada só enquanto a corrida está ativa.'**
  String get trackingNotificationText;

  /// No description provided for @trackingNotificationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Corrida em andamento'**
  String get trackingNotificationTitle;

  /// No description provided for @typeMessage.
  ///
  /// In pt, this message translates to:
  /// **'Digite sua mensagem'**
  String get typeMessage;

  /// No description provided for @typeNumber.
  ///
  /// In pt, this message translates to:
  /// **'Digitar o número da moto'**
  String get typeNumber;

  /// No description provided for @useCamera.
  ///
  /// In pt, this message translates to:
  /// **'Usar a câmera'**
  String get useCamera;

  /// No description provided for @useWallet.
  ///
  /// In pt, this message translates to:
  /// **'Usar créditos da carteira'**
  String get useWallet;

  /// No description provided for @vehicleNumber.
  ///
  /// In pt, this message translates to:
  /// **'Número da moto'**
  String get vehicleNumber;

  /// No description provided for @verificationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Verificação de identidade'**
  String get verificationTitle;

  /// No description provided for @viewReceipt.
  ///
  /// In pt, this message translates to:
  /// **'Ver recibo'**
  String get viewReceipt;

  /// No description provided for @waitingLock.
  ///
  /// In pt, this message translates to:
  /// **'Aguardando a moto travar'**
  String get waitingLock;

  /// No description provided for @waitingLockText.
  ///
  /// In pt, this message translates to:
  /// **'A moto precisa parar para travar com segurança. Isso leva alguns segundos.'**
  String get waitingLockText;

  /// No description provided for @wallet.
  ///
  /// In pt, this message translates to:
  /// **'Carteira'**
  String get wallet;

  /// No description provided for @walletBalanceTitle.
  ///
  /// In pt, this message translates to:
  /// **'Saldo'**
  String get walletBalanceTitle;

  /// No description provided for @welcomeSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Por minuto, hora, dia ou semana. Liberada pelo app em segundos.'**
  String get welcomeSubtitle;

  /// No description provided for @welcomeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Pegue uma moto e vá.'**
  String get welcomeTitle;

  /// No description provided for @wellbeingText.
  ///
  /// In pt, this message translates to:
  /// **'Detectamos uma possível queda. Sem resposta em 60 segundos, acionamos o suporte.'**
  String get wellbeingText;

  /// No description provided for @wellbeingTitle.
  ///
  /// In pt, this message translates to:
  /// **'Você está bem?'**
  String get wellbeingTitle;

  /// No description provided for @yourLocation.
  ///
  /// In pt, this message translates to:
  /// **'Sua localização'**
  String get yourLocation;

  /// No description provided for @zoneNotice.
  ///
  /// In pt, this message translates to:
  /// **'Aviso de zona'**
  String get zoneNotice;

  /// No description provided for @greeting.
  ///
  /// In pt, this message translates to:
  /// **'Olá, {name}'**
  String greeting(String name);

  /// No description provided for @historyItem.
  ///
  /// In pt, this message translates to:
  /// **'Moto {code} · {date}'**
  String historyItem(String code, String date);

  /// No description provided for @minutesBalance.
  ///
  /// In pt, this message translates to:
  /// **'{minutes} min'**
  String minutesBalance(int minutes);

  /// No description provided for @perUnit.
  ///
  /// In pt, this message translates to:
  /// **'por {unit}'**
  String perUnit(String unit);

  /// No description provided for @pixText.
  ///
  /// In pt, this message translates to:
  /// **'Pague {amount} para liberar a moto. A caução volta quando você encerra a corrida.'**
  String pixText(String amount);

  /// No description provided for @receiptNumber.
  ///
  /// In pt, this message translates to:
  /// **'Recibo {number}'**
  String receiptNumber(String number);

  /// No description provided for @reservationRemaining.
  ///
  /// In pt, this message translates to:
  /// **'Reserva expira em {time}'**
  String reservationRemaining(String time);

  /// No description provided for @shareLocationMessage.
  ///
  /// In pt, this message translates to:
  /// **'Estou numa corrida Volti e preciso de ajuda. Minha localização: {url}'**
  String shareLocationMessage(String url);

  /// No description provided for @speedSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade {speed} quilômetros por hora, limite {limit}'**
  String speedSemantics(int speed, int limit);

  /// No description provided for @speedUnit.
  ///
  /// In pt, this message translates to:
  /// **'km/h · limite {limit}'**
  String speedUnit(int limit);

  /// No description provided for @starsLabel.
  ///
  /// In pt, this message translates to:
  /// **'{n, plural, =1{1 estrela} other{{n} estrelas}}'**
  String starsLabel(int n);

  /// No description provided for @stepOf.
  ///
  /// In pt, this message translates to:
  /// **'Passo {n} de {total}'**
  String stepOf(int n, int total);

  /// No description provided for @subscriptionRenews.
  ///
  /// In pt, this message translates to:
  /// **'Renova em {date}'**
  String subscriptionRenews(String date);

  /// No description provided for @unlockFee.
  ///
  /// In pt, this message translates to:
  /// **'Taxa de desbloqueio {fee}'**
  String unlockFee(String fee);

  /// No description provided for @unreadMessages.
  ///
  /// In pt, this message translates to:
  /// **'{n, plural, =1{1 mensagem nova} other{{n} mensagens novas}}'**
  String unreadMessages(int n);

  /// No description provided for @vehicleCode.
  ///
  /// In pt, this message translates to:
  /// **'Moto {code}'**
  String vehicleCode(String code);

  /// No description provided for @vehicleSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{model}, bateria {pct} por cento'**
  String vehicleSemantics(String model, int pct);

  /// No description provided for @walletBalance.
  ///
  /// In pt, this message translates to:
  /// **'Saldo {money} e {minutes} min'**
  String walletBalance(String money, int minutes);

  /// No description provided for @zoneLimit.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade máxima: {limit} km/h'**
  String zoneLimit(int limit);

  /// No description provided for @lockNotConfirmed.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos confirmar a trava'**
  String get lockNotConfirmed;

  /// No description provided for @lockNotConfirmedText.
  ///
  /// In pt, this message translates to:
  /// **'A moto ainda não confirmou que travou. Tente de novo ou fale com o suporte para não ser cobrado a mais.'**
  String get lockNotConfirmedText;

  /// No description provided for @contactSupport.
  ///
  /// In pt, this message translates to:
  /// **'Falar com o suporte'**
  String get contactSupport;

  /// No description provided for @realtimeOffline.
  ///
  /// In pt, this message translates to:
  /// **'Sem conexão em tempo real'**
  String get realtimeOffline;

  /// No description provided for @locationRationaleTitle.
  ///
  /// In pt, this message translates to:
  /// **'Motos por perto'**
  String get locationRationaleTitle;

  /// No description provided for @locationRationaleText.
  ///
  /// In pt, this message translates to:
  /// **'Usamos sua localização para mostrar as motos mais próximas e, durante o aluguel, para sua segurança. Fora do aluguel, não rastreamos você. Na próxima tela o sistema vai pedir a permissão.'**
  String get locationRationaleText;

  /// No description provided for @allowLocation.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get allowLocation;

  /// No description provided for @birthInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Data inválida. Use dd/mm/aaaa.'**
  String get birthInvalid;

  /// No description provided for @cpfInvalid.
  ///
  /// In pt, this message translates to:
  /// **'CPF inválido. Confira os 11 dígitos.'**
  String get cpfInvalid;

  /// No description provided for @nameRequired.
  ///
  /// In pt, this message translates to:
  /// **'Informe seu nome completo.'**
  String get nameRequired;

  /// No description provided for @kycResend.
  ///
  /// In pt, this message translates to:
  /// **'Enviar de novo'**
  String get kycResend;

  /// No description provided for @birthUnderage.
  ///
  /// In pt, this message translates to:
  /// **'É preciso ter 18 anos ou mais.'**
  String get birthUnderage;

  /// No description provided for @historyEmptyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma corrida ainda'**
  String get historyEmptyTitle;

  /// No description provided for @supportEmptyText.
  ///
  /// In pt, this message translates to:
  /// **'Quando precisar, abra uma conversa. A equipe responde por aqui mesmo.'**
  String get supportEmptyText;

  /// No description provided for @noVehiclesNearbyText.
  ///
  /// In pt, this message translates to:
  /// **'Afaste o mapa ou tente de novo em alguns minutos.'**
  String get noVehiclesNearbyText;

  /// No description provided for @noReservationText.
  ///
  /// In pt, this message translates to:
  /// **'Escolha uma moto no mapa e reserve por 15 minutos sem custo.'**
  String get noReservationText;

  /// No description provided for @sosHint.
  ///
  /// In pt, this message translates to:
  /// **'Ligar para o suporte ou compartilhar sua localização'**
  String get sosHint;

  /// No description provided for @cancelRenewalTitle.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar a renovação?'**
  String get cancelRenewalTitle;

  /// No description provided for @cancelRenewalConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar renovação'**
  String get cancelRenewalConfirm;

  /// No description provided for @keepPlan.
  ///
  /// In pt, this message translates to:
  /// **'Manter plano'**
  String get keepPlan;

  /// No description provided for @unitMinute.
  ///
  /// In pt, this message translates to:
  /// **'minuto'**
  String get unitMinute;

  /// No description provided for @unitHour.
  ///
  /// In pt, this message translates to:
  /// **'hora'**
  String get unitHour;

  /// No description provided for @unitDay.
  ///
  /// In pt, this message translates to:
  /// **'dia'**
  String get unitDay;

  /// No description provided for @unitWeek.
  ///
  /// In pt, this message translates to:
  /// **'semana'**
  String get unitWeek;

  /// No description provided for @unitMonth.
  ///
  /// In pt, this message translates to:
  /// **'mês'**
  String get unitMonth;

  /// No description provided for @pixPaid.
  ///
  /// In pt, this message translates to:
  /// **'Pix confirmado'**
  String get pixPaid;

  /// No description provided for @realtimeOfflineText.
  ///
  /// In pt, this message translates to:
  /// **'O tempo e o custo seguem contando. Estamos reconectando.'**
  String get realtimeOfflineText;

  /// No description provided for @lockConfirmed.
  ///
  /// In pt, this message translates to:
  /// **'Moto travada'**
  String get lockConfirmed;

  /// No description provided for @dragToClose.
  ///
  /// In pt, this message translates to:
  /// **'Arraste para baixo para fechar'**
  String get dragToClose;

  /// No description provided for @packagesEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum pacote disponível agora.'**
  String get packagesEmpty;

  /// No description provided for @subscriptionsEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Você ainda não tem plano semanal ou mensal.'**
  String get subscriptionsEmpty;

  /// No description provided for @cancelRenewalText.
  ///
  /// In pt, this message translates to:
  /// **'Seu plano continua valendo até {date}. Depois disso, não renova.'**
  String cancelRenewalText(String date);
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
