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
  /// **'Minha conta'**
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

  /// No description provided for @callSamu.
  ///
  /// In pt, this message translates to:
  /// **'Ligar 192 (SAMU)'**
  String get callSamu;

  /// No description provided for @callSamuSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Ligar para o SAMU, telefone 192'**
  String get callSamuSemantics;

  /// No description provided for @callPolice.
  ///
  /// In pt, this message translates to:
  /// **'Ligar 190 (Polícia)'**
  String get callPolice;

  /// No description provided for @callPoliceSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Ligar para a Polícia, telefone 190'**
  String get callPoliceSemantics;

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

  /// No description provided for @cardFormTitle.
  ///
  /// In pt, this message translates to:
  /// **'Novo cartão'**
  String get cardFormTitle;

  /// No description provided for @cardFormHint.
  ///
  /// In pt, this message translates to:
  /// **'Os dados vão direto ao Mercado Pago. A Volti guarda só um código do cartão.'**
  String get cardFormHint;

  /// No description provided for @cardNumber.
  ///
  /// In pt, this message translates to:
  /// **'Número do cartão'**
  String get cardNumber;

  /// No description provided for @cardHolder.
  ///
  /// In pt, this message translates to:
  /// **'Nome impresso no cartão'**
  String get cardHolder;

  /// No description provided for @cardExpiry.
  ///
  /// In pt, this message translates to:
  /// **'Validade (MM/AA)'**
  String get cardExpiry;

  /// No description provided for @cardExpiryHint.
  ///
  /// In pt, this message translates to:
  /// **'MM/AA'**
  String get cardExpiryHint;

  /// No description provided for @cardCvv.
  ///
  /// In pt, this message translates to:
  /// **'CVV'**
  String get cardCvv;

  /// No description provided for @cardHolderCpf.
  ///
  /// In pt, this message translates to:
  /// **'CPF do titular'**
  String get cardHolderCpf;

  /// No description provided for @cardSave.
  ///
  /// In pt, this message translates to:
  /// **'Salvar cartão'**
  String get cardSave;

  /// No description provided for @cardNumberInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Número de cartão inválido. Confira os dígitos.'**
  String get cardNumberInvalid;

  /// No description provided for @cardExpiryInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Data inválida'**
  String get cardExpiryInvalid;

  /// No description provided for @cardErrorInvalidCard.
  ///
  /// In pt, this message translates to:
  /// **'Cartão inválido. Confira o número.'**
  String get cardErrorInvalidCard;

  /// No description provided for @cardErrorInvalidCvv.
  ///
  /// In pt, this message translates to:
  /// **'CVV inválido. Confira o código de segurança.'**
  String get cardErrorInvalidCvv;

  /// No description provided for @cardErrorInvalidExpiry.
  ///
  /// In pt, this message translates to:
  /// **'Validade inválida. Confira o mês e o ano.'**
  String get cardErrorInvalidExpiry;

  /// No description provided for @cardErrorInvalidHolder.
  ///
  /// In pt, this message translates to:
  /// **'Nome do titular inválido. Use o nome como está no cartão.'**
  String get cardErrorInvalidHolder;

  /// No description provided for @cardErrorInvalidDocument.
  ///
  /// In pt, this message translates to:
  /// **'CPF do titular inválido.'**
  String get cardErrorInvalidDocument;

  /// No description provided for @cardErrorTimeout.
  ///
  /// In pt, this message translates to:
  /// **'O Mercado Pago demorou para responder. Tente de novo.'**
  String get cardErrorTimeout;

  /// No description provided for @cardErrorUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'O Mercado Pago está indisponível agora. Tente em instantes.'**
  String get cardErrorUnavailable;

  /// No description provided for @cardErrorGeneric.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível validar o cartão. Tente de novo.'**
  String get cardErrorGeneric;

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
  /// **'Confirmar e destravar'**
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
  /// **'Escolha seu plano'**
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
  /// **'Digitar número da moto'**
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
  /// **'Escolha a moto no app e retire no galpão. Por dia, semana ou mês.'**
  String get welcomeSubtitle;

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
  /// **'Pague {amount} para confirmar a reserva. A moto é liberada na entrega, no galpão, e a caução volta quando você encerra a corrida.'**
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
  /// **'Galpão mais perto'**
  String get locationRationaleTitle;

  /// No description provided for @locationRationaleText.
  ///
  /// In pt, this message translates to:
  /// **'Usamos sua localização para mostrar o galpão Volti mais perto de você e, durante o aluguel, para sua segurança. Fora do aluguel, não rastreamos você. Na próxima tela o sistema vai pedir a permissão.'**
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

  /// No description provided for @pickTitle.
  ///
  /// In pt, this message translates to:
  /// **'Escolha sua moto'**
  String get pickTitle;

  /// No description provided for @pickAvailable.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{Nenhuma disponível perto de você} =1{1 disponível perto de você} other{{count} disponíveis perto de você}}'**
  String pickAvailable(int count);

  /// No description provided for @pickSeeMap.
  ///
  /// In pt, this message translates to:
  /// **'Ver no mapa'**
  String get pickSeeMap;

  /// No description provided for @pickAllModels.
  ///
  /// In pt, this message translates to:
  /// **'Todas'**
  String get pickAllModels;

  /// No description provided for @pickModelFilters.
  ///
  /// In pt, this message translates to:
  /// **'Filtrar por modelo'**
  String get pickModelFilters;

  /// No description provided for @categoryUrban.
  ///
  /// In pt, this message translates to:
  /// **'Urbana'**
  String get categoryUrban;

  /// No description provided for @categoryDoubleSeat.
  ///
  /// In pt, this message translates to:
  /// **'Assento duplo'**
  String get categoryDoubleSeat;

  /// No description provided for @categoryCargo.
  ///
  /// In pt, this message translates to:
  /// **'Com baú · entregas'**
  String get categoryCargo;

  /// No description provided for @firstRideFreeBadge.
  ///
  /// In pt, this message translates to:
  /// **'1ª grátis'**
  String get firstRideFreeBadge;

  /// No description provided for @pickHoldNote.
  ///
  /// In pt, this message translates to:
  /// **'A moto fica reservada por {minutes} min, sem custo.'**
  String pickHoldNote(int minutes);

  /// No description provided for @reserveModelCode.
  ///
  /// In pt, this message translates to:
  /// **'Reservar {model} · {code}'**
  String reserveModelCode(String model, String code);

  /// No description provided for @selectABike.
  ///
  /// In pt, this message translates to:
  /// **'Selecione uma moto'**
  String get selectABike;

  /// No description provided for @walkSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{distance} a pé, {minutes} minutos'**
  String walkSemantics(String distance, int minutes);

  /// No description provided for @rangeSemantics.
  ///
  /// In pt, this message translates to:
  /// **'autonomia de cerca de {km} quilômetros'**
  String rangeSemantics(int km);

  /// No description provided for @priceSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{price} por minuto'**
  String priceSemantics(String price);

  /// No description provided for @selectedSemantics.
  ///
  /// In pt, this message translates to:
  /// **'selecionada'**
  String get selectedSemantics;

  /// No description provided for @blockKycPending.
  ///
  /// In pt, this message translates to:
  /// **'Você pode reservar depois da aprovação dos seus documentos.'**
  String get blockKycPending;

  /// No description provided for @blockKycRejected.
  ///
  /// In pt, this message translates to:
  /// **'Sua verificação foi recusada. Envie novos documentos em Conta.'**
  String get blockKycRejected;

  /// No description provided for @blockDelinquent.
  ///
  /// In pt, this message translates to:
  /// **'Há um pagamento pendente. Regularize para reservar.'**
  String get blockDelinquent;

  /// No description provided for @blockActiveReservation.
  ///
  /// In pt, this message translates to:
  /// **'Você já tem uma reserva ativa.'**
  String get blockActiveReservation;

  /// No description provided for @blockActiveRental.
  ///
  /// In pt, this message translates to:
  /// **'Você está com uma corrida em andamento.'**
  String get blockActiveRental;

  /// No description provided for @pickEmptyModel.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma moto deste modelo por perto'**
  String get pickEmptyModel;

  /// No description provided for @pickEmptyModelText.
  ///
  /// In pt, this message translates to:
  /// **'Escolha outro modelo ou veja todas.'**
  String get pickEmptyModelText;

  /// No description provided for @chooseBike.
  ///
  /// In pt, this message translates to:
  /// **'Escolher moto'**
  String get chooseBike;

  /// No description provided for @filterAll.
  ///
  /// In pt, this message translates to:
  /// **'Todas'**
  String get filterAll;

  /// No description provided for @filterRange10.
  ///
  /// In pt, this message translates to:
  /// **'Autonomia 10+ km'**
  String get filterRange10;

  /// No description provided for @filterPickupPoints.
  ///
  /// In pt, this message translates to:
  /// **'Pontos de retirada'**
  String get filterPickupPoints;

  /// No description provided for @promoPassTitle.
  ///
  /// In pt, this message translates to:
  /// **'Desbloqueie seu passe'**
  String get promoPassTitle;

  /// No description provided for @promoPassText.
  ///
  /// In pt, this message translates to:
  /// **'Ande mais, pague menos'**
  String get promoPassText;

  /// No description provided for @promoFirstRideTitle.
  ///
  /// In pt, this message translates to:
  /// **'1ª corrida grátis'**
  String get promoFirstRideTitle;

  /// No description provided for @promoFirstRideText.
  ///
  /// In pt, this message translates to:
  /// **'Até 15 minutos'**
  String get promoFirstRideText;

  /// No description provided for @yourLocationAt.
  ///
  /// In pt, this message translates to:
  /// **'Sua localização · {place}'**
  String yourLocationAt(String place);

  /// No description provided for @nearYou.
  ///
  /// In pt, this message translates to:
  /// **'Perto de você'**
  String get nearYou;

  /// No description provided for @notifications.
  ///
  /// In pt, this message translates to:
  /// **'Notificações'**
  String get notifications;

  /// No description provided for @notificationsUnread.
  ///
  /// In pt, this message translates to:
  /// **'Notificações, há mensagens novas'**
  String get notificationsUnread;

  /// No description provided for @batterySemantics.
  ///
  /// In pt, this message translates to:
  /// **'bateria {pct} por cento'**
  String batterySemantics(int pct);

  /// No description provided for @pickVehicleTaken.
  ///
  /// In pt, this message translates to:
  /// **'Essa moto acabou de ser reservada. Escolha outra.'**
  String get pickVehicleTaken;

  /// No description provided for @pickupZonesError.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos carregar os pontos de retirada.'**
  String get pickupZonesError;

  /// No description provided for @fareLabel.
  ///
  /// In pt, this message translates to:
  /// **'Tarifa'**
  String get fareLabel;

  /// No description provided for @coverageBasicLong.
  ///
  /// In pt, this message translates to:
  /// **'Seguro básico'**
  String get coverageBasicLong;

  /// No description provided for @coverageFullLong.
  ///
  /// In pt, this message translates to:
  /// **'Seguro completo'**
  String get coverageFullLong;

  /// No description provided for @unpauseRide.
  ///
  /// In pt, this message translates to:
  /// **'Destravar'**
  String get unpauseRide;

  /// No description provided for @zoneReducedSpeed.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade reduzida'**
  String get zoneReducedSpeed;

  /// No description provided for @zoneForbidden.
  ///
  /// In pt, this message translates to:
  /// **'Área proibida'**
  String get zoneForbidden;

  /// No description provided for @zoneOperationEdge.
  ///
  /// In pt, this message translates to:
  /// **'Limite da área de operação'**
  String get zoneOperationEdge;

  /// No description provided for @wellbeingLead.
  ///
  /// In pt, this message translates to:
  /// **'Detectamos uma possível queda. Sem resposta em '**
  String get wellbeingLead;

  /// No description provided for @wellbeingTail.
  ///
  /// In pt, this message translates to:
  /// **', acionamos o suporte.'**
  String get wellbeingTail;

  /// No description provided for @wellbeingTimedOut.
  ///
  /// In pt, this message translates to:
  /// **'Sem resposta: acionamos o suporte.'**
  String get wellbeingTimedOut;

  /// No description provided for @addEmergencyContact.
  ///
  /// In pt, this message translates to:
  /// **'Cadastrar contato de emergência'**
  String get addEmergencyContact;

  /// No description provided for @noEmergencyContactHint.
  ///
  /// In pt, this message translates to:
  /// **'Com um contato salvo, o link vai direto para ele.'**
  String get noEmergencyContactHint;

  /// No description provided for @reportOnly.
  ///
  /// In pt, this message translates to:
  /// **'Só reportar'**
  String get reportOnly;

  /// No description provided for @swapNoFee.
  ///
  /// In pt, this message translates to:
  /// **'Trocar de moto sem nova taxa'**
  String get swapNoFee;

  /// No description provided for @returnPointTitle.
  ///
  /// In pt, this message translates to:
  /// **'Ponto de devolução'**
  String get returnPointTitle;

  /// No description provided for @returnOutsideShort.
  ///
  /// In pt, this message translates to:
  /// **'Fora dos pontos verdes'**
  String get returnOutsideShort;

  /// No description provided for @returnCheckingShort.
  ///
  /// In pt, this message translates to:
  /// **'Procurando pontos de devolução'**
  String get returnCheckingShort;

  /// No description provided for @returnStepPhoto.
  ///
  /// In pt, this message translates to:
  /// **'Passo 1 de 2 · Foto'**
  String get returnStepPhoto;

  /// No description provided for @returnStepLock.
  ///
  /// In pt, this message translates to:
  /// **'Passo 2 de 2 · Travar'**
  String get returnStepLock;

  /// No description provided for @returnPhotoTitle.
  ///
  /// In pt, this message translates to:
  /// **'Fotografe a moto estacionada'**
  String get returnPhotoTitle;

  /// No description provided for @takePhoto.
  ///
  /// In pt, this message translates to:
  /// **'Tirar foto'**
  String get takePhoto;

  /// No description provided for @returnPhotoHintDesign.
  ///
  /// In pt, this message translates to:
  /// **'Mostre a moto inteira e a calçada livre'**
  String get returnPhotoHintDesign;

  /// No description provided for @returnZoneRule.
  ///
  /// In pt, this message translates to:
  /// **'Fora dos pontos verdes não é possível encerrar sem taxa.'**
  String get returnZoneRule;

  /// No description provided for @returnOutsideBlocked.
  ///
  /// In pt, this message translates to:
  /// **'Leve a moto até uma área verde do mapa para encerrar. Fora dela, encerrar só com o suporte, com taxa.'**
  String get returnOutsideBlocked;

  /// No description provided for @lockAndEnd.
  ///
  /// In pt, this message translates to:
  /// **'Travar e encerrar'**
  String get lockAndEnd;

  /// No description provided for @confirmingLock.
  ///
  /// In pt, this message translates to:
  /// **'Confirmando…'**
  String get confirmingLock;

  /// No description provided for @returnPinLabel.
  ///
  /// In pt, this message translates to:
  /// **'Ponto de devolução mais próximo'**
  String get returnPinLabel;

  /// No description provided for @rideFinished.
  ///
  /// In pt, this message translates to:
  /// **'Corrida finalizada'**
  String get rideFinished;

  /// No description provided for @rideFinishedText.
  ///
  /// In pt, this message translates to:
  /// **'Moto travada. Caução liberada.'**
  String get rideFinishedText;

  /// No description provided for @receiptAndInvoice.
  ///
  /// In pt, this message translates to:
  /// **'Recibo e nota fiscal'**
  String get receiptAndInvoice;

  /// No description provided for @paidWithPix.
  ///
  /// In pt, this message translates to:
  /// **'Pix'**
  String get paidWithPix;

  /// No description provided for @paidWithWallet.
  ///
  /// In pt, this message translates to:
  /// **'Carteira Volti'**
  String get paidWithWallet;

  /// No description provided for @receiptPdfPending.
  ///
  /// In pt, this message translates to:
  /// **'O PDF fica pronto em instantes.'**
  String get receiptPdfPending;

  /// No description provided for @rateRideTrip.
  ///
  /// In pt, this message translates to:
  /// **'Como foi a moto e a viagem?'**
  String get rateRideTrip;

  /// No description provided for @ratingCommentHint.
  ///
  /// In pt, this message translates to:
  /// **'Comentário (opcional)'**
  String get ratingCommentHint;

  /// No description provided for @finishSummary.
  ///
  /// In pt, this message translates to:
  /// **'Concluir'**
  String get finishSummary;

  /// No description provided for @farePerMinute.
  ///
  /// In pt, this message translates to:
  /// **'{price}/min'**
  String farePerMinute(String price);

  /// No description provided for @farePerHour.
  ///
  /// In pt, this message translates to:
  /// **'{price}/h'**
  String farePerHour(String price);

  /// No description provided for @farePerDay.
  ///
  /// In pt, this message translates to:
  /// **'{price}/dia'**
  String farePerDay(String price);

  /// No description provided for @pausedFareSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Pausada, {price}'**
  String pausedFareSemantics(String price);

  /// No description provided for @zoneTitle.
  ///
  /// In pt, this message translates to:
  /// **'{name} · limite {limit} km/h'**
  String zoneTitle(String name, int limit);

  /// No description provided for @secondsShort.
  ///
  /// In pt, this message translates to:
  /// **'{seconds} s'**
  String secondsShort(int seconds);

  /// No description provided for @shareWithNamedContact.
  ///
  /// In pt, this message translates to:
  /// **'Enviar localização para {name}'**
  String shareWithNamedContact(String name);

  /// No description provided for @returnInsideZone.
  ///
  /// In pt, this message translates to:
  /// **'{name} · você está dentro'**
  String returnInsideZone(String name);

  /// No description provided for @returnZonesMap.
  ///
  /// In pt, this message translates to:
  /// **'Mapa com {count} pontos de devolução'**
  String returnZonesMap(int count);

  /// No description provided for @paidWithCard.
  ///
  /// In pt, this message translates to:
  /// **'Cartão •••• {last4}'**
  String paidWithCard(String last4);

  /// No description provided for @invoiceNumberLabel.
  ///
  /// In pt, this message translates to:
  /// **'NFS-e {number}'**
  String invoiceNumberLabel(String number);

  /// No description provided for @receiptOpenError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir o recibo. Tente de novo.'**
  String get receiptOpenError;

  /// No description provided for @shareLocationMessageTimed.
  ///
  /// In pt, this message translates to:
  /// **'Estou numa corrida Volti e preciso de ajuda. Minha localização (link válido por 1 h): {url}'**
  String shareLocationMessageTimed(String url);

  /// No description provided for @adultBadge.
  ///
  /// In pt, this message translates to:
  /// **'18+'**
  String get adultBadge;

  /// No description provided for @attachmentFailed.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível enviar o anexo. Toque nele para tentar de novo.'**
  String get attachmentFailed;

  /// No description provided for @attachmentFailedLabel.
  ///
  /// In pt, this message translates to:
  /// **'Anexo {n}: falhou, toque para tentar de novo'**
  String attachmentFailedLabel(int n);

  /// No description provided for @attachmentRemove.
  ///
  /// In pt, this message translates to:
  /// **'Remover anexo {n}'**
  String attachmentRemove(int n);

  /// No description provided for @attachmentRetryFirst.
  ///
  /// In pt, this message translates to:
  /// **'Reenvie ou remova os anexos que falharam.'**
  String get attachmentRetryFirst;

  /// No description provided for @attachmentSentLabel.
  ///
  /// In pt, this message translates to:
  /// **'Anexo {n}: enviado'**
  String attachmentSentLabel(int n);

  /// No description provided for @attachmentUploading.
  ///
  /// In pt, this message translates to:
  /// **'Enviando anexo…'**
  String get attachmentUploading;

  /// No description provided for @attachmentUploadingLabel.
  ///
  /// In pt, this message translates to:
  /// **'Anexo {n}: enviando'**
  String attachmentUploadingLabel(int n);

  /// No description provided for @buyPackageText.
  ///
  /// In pt, this message translates to:
  /// **'{minutes} minutos por {price}, pagos com Pix. Os minutos entram assim que o pagamento for confirmado.'**
  String buyPackageText(int minutes, String price);

  /// No description provided for @buyPackageTitle.
  ///
  /// In pt, this message translates to:
  /// **'Comprar {name}?'**
  String buyPackageTitle(String name);

  /// No description provided for @chatAttach.
  ///
  /// In pt, this message translates to:
  /// **'Anexar foto'**
  String get chatAttach;

  /// No description provided for @chatAttachments.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =1{1 foto anexada} other{{count} fotos anexadas}}'**
  String chatAttachments(int count);

  /// No description provided for @chatPhotoOnly.
  ///
  /// In pt, this message translates to:
  /// **'Foto anexada'**
  String get chatPhotoOnly;

  /// No description provided for @chatSupportAgent.
  ///
  /// In pt, this message translates to:
  /// **'Suporte Volti'**
  String get chatSupportAgent;

  /// No description provided for @chatYou.
  ///
  /// In pt, this message translates to:
  /// **'Você'**
  String get chatYou;

  /// No description provided for @claimAddMorePhoto.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar outra foto'**
  String get claimAddMorePhoto;

  /// No description provided for @claimAddMorePoliceReport.
  ///
  /// In pt, this message translates to:
  /// **'Adicionar outra página do BO'**
  String get claimAddMorePoliceReport;

  /// No description provided for @claimAddPhoto.
  ///
  /// In pt, this message translates to:
  /// **'Tirar foto'**
  String get claimAddPhoto;

  /// No description provided for @claimAddPoliceReport.
  ///
  /// In pt, this message translates to:
  /// **'Fotografar o boletim de ocorrência'**
  String get claimAddPoliceReport;

  /// No description provided for @claimAttachmentsFull.
  ///
  /// In pt, this message translates to:
  /// **'Limite de {max} anexos atingido.'**
  String claimAttachmentsFull(int max);

  /// No description provided for @claimDescriptionHint.
  ///
  /// In pt, this message translates to:
  /// **'Onde, quando e como aconteceu'**
  String get claimDescriptionHint;

  /// No description provided for @claimIntro.
  ///
  /// In pt, this message translates to:
  /// **'O sinistro vai para a seguradora parceira. Quanto mais detalhes e fotos, mais rápida a análise.'**
  String get claimIntro;

  /// No description provided for @claimMinChars.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =1{Falta 1 caractere} other{Faltam {count} caracteres}} (mínimo de 10)'**
  String claimMinChars(int count);

  /// No description provided for @claimPhotoCaptureHint.
  ///
  /// In pt, this message translates to:
  /// **'Mostre os danos, a moto e o local'**
  String get claimPhotoCaptureHint;

  /// No description provided for @claimPhotosHint.
  ///
  /// In pt, this message translates to:
  /// **'Até {max} anexos no total, contando o boletim de ocorrência.'**
  String claimPhotosHint(int max);

  /// No description provided for @claimPhotosTitle.
  ///
  /// In pt, this message translates to:
  /// **'Fotos'**
  String get claimPhotosTitle;

  /// No description provided for @claimPoliceReportHint.
  ///
  /// In pt, this message translates to:
  /// **'Opcional. Se você registrou um BO, fotografe as páginas.'**
  String get claimPoliceReportHint;

  /// No description provided for @claimPoliceReportRecommended.
  ///
  /// In pt, this message translates to:
  /// **'Em furto ou acidente, o boletim de ocorrência agiliza a análise. Fotografe as páginas.'**
  String get claimPoliceReportRecommended;

  /// No description provided for @claimPoliceReportTitle.
  ///
  /// In pt, this message translates to:
  /// **'Boletim de ocorrência (BO)'**
  String get claimPoliceReportTitle;

  /// No description provided for @claimSend.
  ///
  /// In pt, this message translates to:
  /// **'Enviar sinistro'**
  String get claimSend;

  /// No description provided for @claimTypeTitle.
  ///
  /// In pt, this message translates to:
  /// **'O que aconteceu?'**
  String get claimTypeTitle;

  /// No description provided for @consentsRow.
  ///
  /// In pt, this message translates to:
  /// **'Consentimentos e privacidade'**
  String get consentsRow;

  /// No description provided for @credits.
  ///
  /// In pt, this message translates to:
  /// **'Créditos'**
  String get credits;

  /// No description provided for @disputeDetailsLabel.
  ///
  /// In pt, this message translates to:
  /// **'Detalhes (opcional)'**
  String get disputeDetailsLabel;

  /// No description provided for @disputeOrClaim.
  ///
  /// In pt, this message translates to:
  /// **'Contestar cobrança / sinistro'**
  String get disputeOrClaim;

  /// No description provided for @disputeReasonLabel.
  ///
  /// In pt, this message translates to:
  /// **'Motivo'**
  String get disputeReasonLabel;

  /// No description provided for @disputeRefund.
  ///
  /// In pt, this message translates to:
  /// **'Estorno de {amount}'**
  String disputeRefund(String amount);

  /// No description provided for @downloadMyData.
  ///
  /// In pt, this message translates to:
  /// **'Baixar meus dados'**
  String get downloadMyData;

  /// No description provided for @emergencyName.
  ///
  /// In pt, this message translates to:
  /// **'Nome do contato'**
  String get emergencyName;

  /// No description provided for @emergencyNameRequired.
  ///
  /// In pt, this message translates to:
  /// **'Informe o nome do contato'**
  String get emergencyNameRequired;

  /// No description provided for @emergencyNameTooLong.
  ///
  /// In pt, this message translates to:
  /// **'Use até 120 caracteres'**
  String get emergencyNameTooLong;

  /// No description provided for @emergencyPhone.
  ///
  /// In pt, this message translates to:
  /// **'Celular do contato'**
  String get emergencyPhone;

  /// No description provided for @emergencyPhoneHint.
  ///
  /// In pt, this message translates to:
  /// **'Com DDD. Para outro país, comece com + e o código do país.'**
  String get emergencyPhoneHint;

  /// No description provided for @emergencyPhoneInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Celular inválido. Use DDD + número.'**
  String get emergencyPhoneInvalid;

  /// No description provided for @emergencyRowEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Cadastre para usar no SOS'**
  String get emergencyRowEmpty;

  /// No description provided for @emergencySaved.
  ///
  /// In pt, this message translates to:
  /// **'Contato de emergência salvo'**
  String get emergencySaved;

  /// No description provided for @emergencyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Contato de emergência'**
  String get emergencyTitle;

  /// No description provided for @emergencyWhyText.
  ///
  /// In pt, this message translates to:
  /// **'No SOS da corrida, enviamos sua localização em tempo real direto para esta pessoa.'**
  String get emergencyWhyText;

  /// No description provided for @emergencyWhyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Para que serve'**
  String get emergencyWhyTitle;

  /// No description provided for @groupHelp.
  ///
  /// In pt, this message translates to:
  /// **'Ajuda'**
  String get groupHelp;

  /// No description provided for @groupPlan.
  ///
  /// In pt, this message translates to:
  /// **'Plano'**
  String get groupPlan;

  /// No description provided for @groupPrivacy.
  ///
  /// In pt, this message translates to:
  /// **'Privacidade (LGPD)'**
  String get groupPrivacy;

  /// No description provided for @groupTrips.
  ///
  /// In pt, this message translates to:
  /// **'Viagens'**
  String get groupTrips;

  /// No description provided for @helpFaq1Title.
  ///
  /// In pt, this message translates to:
  /// **'Como destravo uma moto?'**
  String get helpFaq1Title;

  /// No description provided for @helpFaq1Text.
  ///
  /// In pt, this message translates to:
  /// **'No mapa, toque em Escanear para andar e aponte para o QR no guidão, ou digite o número da moto. Escolha o plano e o seguro e confirme.'**
  String get helpFaq1Text;

  /// No description provided for @helpFaq2Title.
  ///
  /// In pt, this message translates to:
  /// **'O que é a caução?'**
  String get helpFaq2Title;

  /// No description provided for @helpFaq2Text.
  ///
  /// In pt, this message translates to:
  /// **'Uma pré-autorização no cartão ou um depósito via Pix feito antes de destravar. Ela volta quando você encerra a corrida.'**
  String get helpFaq2Text;

  /// No description provided for @helpFaq3Title.
  ///
  /// In pt, this message translates to:
  /// **'Como encerro a corrida?'**
  String get helpFaq3Title;

  /// No description provided for @helpFaq3Text.
  ///
  /// In pt, this message translates to:
  /// **'Pare dentro de um ponto de devolução (área verde no mapa), fotografe a moto estacionada e toque em Travar e encerrar.'**
  String get helpFaq3Text;

  /// No description provided for @helpFaq4Title.
  ///
  /// In pt, this message translates to:
  /// **'Como uso a carteira e os pacotes?'**
  String get helpFaq4Title;

  /// No description provided for @helpFaq4Text.
  ///
  /// In pt, this message translates to:
  /// **'Recarregue a carteira com Pix ou compre um pacote de minutos em Conta. O saldo é usado nas próximas corridas.'**
  String get helpFaq4Text;

  /// No description provided for @helpFaq5Title.
  ///
  /// In pt, this message translates to:
  /// **'Sofri um acidente. E agora?'**
  String get helpFaq5Title;

  /// No description provided for @helpFaq5Text.
  ///
  /// In pt, this message translates to:
  /// **'Durante a corrida, toque em SOS. Depois, abra um sinistro em Conta > Contestar cobrança / sinistro, com fotos e o boletim de ocorrência.'**
  String get helpFaq5Text;

  /// No description provided for @helpStillNeed.
  ///
  /// In pt, this message translates to:
  /// **'Não achou a resposta? Fale com a equipe.'**
  String get helpStillNeed;

  /// No description provided for @historyPickHint.
  ///
  /// In pt, this message translates to:
  /// **'Escolha a corrida que você quer contestar ou para a qual quer abrir um sinistro.'**
  String get historyPickHint;

  /// No description provided for @historyPickTitle.
  ///
  /// In pt, this message translates to:
  /// **'Escolha a corrida'**
  String get historyPickTitle;

  /// No description provided for @historyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Histórico e recibos'**
  String get historyTitle;

  /// No description provided for @kycNotVerified.
  ///
  /// In pt, this message translates to:
  /// **'Não verificada'**
  String get kycNotVerified;

  /// No description provided for @kycVerified.
  ///
  /// In pt, this message translates to:
  /// **'Verificada'**
  String get kycVerified;

  /// No description provided for @minutePackage.
  ///
  /// In pt, this message translates to:
  /// **'Pacote de minutos'**
  String get minutePackage;

  /// No description provided for @minutesDelta.
  ///
  /// In pt, this message translates to:
  /// **'{minutes} min'**
  String minutesDelta(int minutes);

  /// No description provided for @noActivePlan.
  ///
  /// In pt, this message translates to:
  /// **'Sem plano ativo · semanal ou mensal'**
  String get noActivePlan;

  /// No description provided for @payWithPix.
  ///
  /// In pt, this message translates to:
  /// **'Pagar com Pix'**
  String get payWithPix;

  /// No description provided for @perMonth.
  ///
  /// In pt, this message translates to:
  /// **'/mês'**
  String get perMonth;

  /// No description provided for @perWeek.
  ///
  /// In pt, this message translates to:
  /// **'/semana'**
  String get perWeek;

  /// No description provided for @pixExpired.
  ///
  /// In pt, this message translates to:
  /// **'O Pix expirou. Gere um novo código.'**
  String get pixExpired;

  /// No description provided for @pixExpiresAt.
  ///
  /// In pt, this message translates to:
  /// **'Válido até {date}'**
  String pixExpiresAt(String date);

  /// No description provided for @pixPayLater.
  ///
  /// In pt, this message translates to:
  /// **'Pagar depois'**
  String get pixPayLater;

  /// No description provided for @pixQrLabel.
  ///
  /// In pt, this message translates to:
  /// **'QR code do Pix'**
  String get pixQrLabel;

  /// No description provided for @planMonthlyDescription.
  ///
  /// In pt, this message translates to:
  /// **'Cobrança recorrente no cartão todo mês'**
  String get planMonthlyDescription;

  /// No description provided for @planWeeklyDescription.
  ///
  /// In pt, this message translates to:
  /// **'Para entregadores · cobrança toda semana'**
  String get planWeeklyDescription;

  /// No description provided for @remove.
  ///
  /// In pt, this message translates to:
  /// **'Remover'**
  String get remove;

  /// No description provided for @requestsClaims.
  ///
  /// In pt, this message translates to:
  /// **'Sinistros'**
  String get requestsClaims;

  /// No description provided for @requestsClaimsEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum sinistro aberto.'**
  String get requestsClaimsEmpty;

  /// No description provided for @requestsDisputes.
  ///
  /// In pt, this message translates to:
  /// **'Contestações'**
  String get requestsDisputes;

  /// No description provided for @requestsDisputesEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma contestação aberta.'**
  String get requestsDisputesEmpty;

  /// No description provided for @requestsNew.
  ///
  /// In pt, this message translates to:
  /// **'Nova contestação ou sinistro'**
  String get requestsNew;

  /// No description provided for @requestsTitle.
  ///
  /// In pt, this message translates to:
  /// **'Contestações e sinistros'**
  String get requestsTitle;

  /// No description provided for @retryShort.
  ///
  /// In pt, this message translates to:
  /// **'Tentar'**
  String get retryShort;

  /// No description provided for @save.
  ///
  /// In pt, this message translates to:
  /// **'Salvar'**
  String get save;

  /// No description provided for @statusAccepted.
  ///
  /// In pt, this message translates to:
  /// **'Aceita'**
  String get statusAccepted;

  /// No description provided for @statusApproved.
  ///
  /// In pt, this message translates to:
  /// **'Aprovado'**
  String get statusApproved;

  /// No description provided for @statusOpen.
  ///
  /// In pt, this message translates to:
  /// **'Aberta'**
  String get statusOpen;

  /// No description provided for @statusPaid.
  ///
  /// In pt, this message translates to:
  /// **'Pago'**
  String get statusPaid;

  /// No description provided for @statusRejected.
  ///
  /// In pt, this message translates to:
  /// **'Recusado'**
  String get statusRejected;

  /// No description provided for @statusSubmitted.
  ///
  /// In pt, this message translates to:
  /// **'Enviado'**
  String get statusSubmitted;

  /// No description provided for @statusUnderReview.
  ///
  /// In pt, this message translates to:
  /// **'Em análise'**
  String get statusUnderReview;

  /// No description provided for @subscribeCardHint.
  ///
  /// In pt, this message translates to:
  /// **'Cobrança recorrente neste cartão'**
  String get subscribeCardHint;

  /// No description provided for @subscribeConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Assinar agora'**
  String get subscribeConfirm;

  /// No description provided for @subscribeConfirmTitle.
  ///
  /// In pt, this message translates to:
  /// **'Assinar o {plan}'**
  String subscribeConfirmTitle(String plan);

  /// No description provided for @subscribeContinue.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get subscribeContinue;

  /// No description provided for @subscribePriceMonthly.
  ///
  /// In pt, this message translates to:
  /// **'{price} por mês'**
  String subscribePriceMonthly(String price);

  /// No description provided for @subscribePriceWeekly.
  ///
  /// In pt, this message translates to:
  /// **'{price} por semana'**
  String subscribePriceWeekly(String price);

  /// No description provided for @subscribeRecurringMonthly.
  ///
  /// In pt, this message translates to:
  /// **'Cobramos hoje e renovamos todo mês no cartão. Corridas no plano mensal não cobram tempo, só seguro e taxas. Cancele quando quiser.'**
  String get subscribeRecurringMonthly;

  /// No description provided for @subscribeRecurringWeekly.
  ///
  /// In pt, this message translates to:
  /// **'Cobramos hoje e renovamos toda semana no cartão. Corridas no plano semanal não cobram tempo, só seguro e taxas. Cancele quando quiser.'**
  String get subscribeRecurringWeekly;

  /// No description provided for @subscriptionActive.
  ///
  /// In pt, this message translates to:
  /// **'Ativo'**
  String get subscriptionActive;

  /// No description provided for @subscriptionBenefit.
  ///
  /// In pt, this message translates to:
  /// **'Corridas no plano não cobram tempo, só seguro e taxas'**
  String get subscriptionBenefit;

  /// No description provided for @subscriptionCanceled.
  ///
  /// In pt, this message translates to:
  /// **'Renovação cancelada'**
  String get subscriptionCanceled;

  /// No description provided for @subscriptionCard.
  ///
  /// In pt, this message translates to:
  /// **'Cartão {card}'**
  String subscriptionCard(String card);

  /// No description provided for @subscriptionCreated.
  ///
  /// In pt, this message translates to:
  /// **'Plano assinado'**
  String get subscriptionCreated;

  /// No description provided for @subscriptionEndedOn.
  ///
  /// In pt, this message translates to:
  /// **'Terminou em {date}'**
  String subscriptionEndedOn(String date);

  /// No description provided for @subscriptionEndingBadge.
  ///
  /// In pt, this message translates to:
  /// **'Termina'**
  String get subscriptionEndingBadge;

  /// No description provided for @subscriptionEndingText.
  ///
  /// In pt, this message translates to:
  /// **'A renovação foi cancelada. O plano vale até {date}.'**
  String subscriptionEndingText(String date);

  /// No description provided for @subscriptionEndsOn.
  ///
  /// In pt, this message translates to:
  /// **'Termina em {date}'**
  String subscriptionEndsOn(String date);

  /// No description provided for @subscriptionNextCharge.
  ///
  /// In pt, this message translates to:
  /// **'Próxima cobrança {date} · {price}'**
  String subscriptionNextCharge(String date, String price);

  /// No description provided for @subscriptionPastDue.
  ///
  /// In pt, this message translates to:
  /// **'Pagamento pendente'**
  String get subscriptionPastDue;

  /// No description provided for @subscriptionsPast.
  ///
  /// In pt, this message translates to:
  /// **'Planos anteriores'**
  String get subscriptionsPast;

  /// No description provided for @supportChat.
  ///
  /// In pt, this message translates to:
  /// **'Chat com o suporte'**
  String get supportChat;

  /// No description provided for @topUpAmountError.
  ///
  /// In pt, this message translates to:
  /// **'Escolha um valor entre R\$ 10,00 e R\$ 1.000,00'**
  String get topUpAmountError;

  /// No description provided for @topUpAmountHint.
  ///
  /// In pt, this message translates to:
  /// **'O crédito entra na carteira assim que o Pix for confirmado.'**
  String get topUpAmountHint;

  /// No description provided for @topUpAmountLabel.
  ///
  /// In pt, this message translates to:
  /// **'Valor'**
  String get topUpAmountLabel;

  /// No description provided for @topUpDone.
  ///
  /// In pt, this message translates to:
  /// **'Carteira recarregada'**
  String get topUpDone;

  /// No description provided for @topUpGeneratePix.
  ///
  /// In pt, this message translates to:
  /// **'Gerar Pix de {amount}'**
  String topUpGeneratePix(String amount);

  /// No description provided for @topUpGeneratePixDisabled.
  ///
  /// In pt, this message translates to:
  /// **'Gerar Pix'**
  String get topUpGeneratePixDisabled;

  /// No description provided for @topUpPaid.
  ///
  /// In pt, this message translates to:
  /// **'Pix confirmado'**
  String get topUpPaid;

  /// No description provided for @topUpPaidAmount.
  ///
  /// In pt, this message translates to:
  /// **'{amount} já estão na sua carteira.'**
  String topUpPaidAmount(String amount);

  /// No description provided for @topUpPaidMinutes.
  ///
  /// In pt, this message translates to:
  /// **'{minutes} minutos já estão na sua carteira.'**
  String topUpPaidMinutes(int minutes);

  /// No description provided for @topUpPixText.
  ///
  /// In pt, this message translates to:
  /// **'Pague {amount} com o QR ou o código copia e cola no app do seu banco.'**
  String topUpPixText(String amount);

  /// No description provided for @topUpWallet.
  ///
  /// In pt, this message translates to:
  /// **'Recarregar carteira'**
  String get topUpWallet;

  /// No description provided for @trafficRules.
  ///
  /// In pt, this message translates to:
  /// **'Regras de trânsito para autopropelidos'**
  String get trafficRules;

  /// No description provided for @trafficRulesTitle.
  ///
  /// In pt, this message translates to:
  /// **'Regras de trânsito'**
  String get trafficRulesTitle;

  /// No description provided for @walletAndPackages.
  ///
  /// In pt, this message translates to:
  /// **'Carteira e pacotes de minutos'**
  String get walletAndPackages;

  /// No description provided for @walletLedgerEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum lançamento ainda.'**
  String get walletLedgerEmpty;

  /// No description provided for @walletLedgerTitle.
  ///
  /// In pt, this message translates to:
  /// **'Extrato'**
  String get walletLedgerTitle;

  /// No description provided for @emergencyConsentLabel.
  ///
  /// In pt, this message translates to:
  /// **'Tenho autorização desta pessoa para receber minha localização em emergências'**
  String get emergencyConsentLabel;

  /// No description provided for @emergencyConsentText.
  ///
  /// In pt, this message translates to:
  /// **'Só compartilhamos sua localização com este contato quando você aciona o SOS. Confirme que a pessoa concorda em receber esses avisos.'**
  String get emergencyConsentText;

  /// No description provided for @pendingTopUpTitle.
  ///
  /// In pt, this message translates to:
  /// **'Pix de {amount} aguardando pagamento'**
  String pendingTopUpTitle(String amount);

  /// No description provided for @pendingTopUpText.
  ///
  /// In pt, this message translates to:
  /// **'O saldo atualiza sozinho quando o pagamento for confirmado. Puxe a tela para baixo para conferir agora.'**
  String get pendingTopUpText;

  /// No description provided for @subscriptionPriceUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'Preço do plano indisponível agora. Tente de novo em instantes.'**
  String get subscriptionPriceUnavailable;

  /// No description provided for @welcomePhone.
  ///
  /// In pt, this message translates to:
  /// **'Continuar com celular'**
  String get welcomePhone;

  /// No description provided for @welcomeApple.
  ///
  /// In pt, this message translates to:
  /// **'Apple'**
  String get welcomeApple;

  /// No description provided for @welcomeAppleLabel.
  ///
  /// In pt, this message translates to:
  /// **'Entrar com Apple'**
  String get welcomeAppleLabel;

  /// No description provided for @welcomeGoogle.
  ///
  /// In pt, this message translates to:
  /// **'Google'**
  String get welcomeGoogle;

  /// No description provided for @welcomeGoogleLabel.
  ///
  /// In pt, this message translates to:
  /// **'Entrar com Google'**
  String get welcomeGoogleLabel;

  /// No description provided for @welcomeDevHint.
  ///
  /// In pt, this message translates to:
  /// **'Modo dev: celular aceita o código 123456; Google e Apple só funcionam com o Cognito.'**
  String get welcomeDevHint;

  /// No description provided for @welcomeSocialDevOnly.
  ///
  /// In pt, this message translates to:
  /// **'No modo dev, Google e Apple não estão disponíveis. Entre com celular ou e-mail.'**
  String get welcomeSocialDevOnly;

  /// No description provided for @socialSignInError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível entrar. Tente de novo.'**
  String get socialSignInError;

  /// No description provided for @otpPhoneTitle.
  ///
  /// In pt, this message translates to:
  /// **'Seu celular'**
  String get otpPhoneTitle;

  /// No description provided for @otpPhoneSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Vamos mandar um código por SMS para confirmar que é você.'**
  String get otpPhoneSubtitle;

  /// No description provided for @otpPhoneLabel.
  ///
  /// In pt, this message translates to:
  /// **'Celular com DDD'**
  String get otpPhoneLabel;

  /// No description provided for @otpPhoneInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Informe um celular com DDD, ex.: (11) 98765-4321.'**
  String get otpPhoneInvalid;

  /// No description provided for @otpEmailTitle.
  ///
  /// In pt, this message translates to:
  /// **'Seu e-mail'**
  String get otpEmailTitle;

  /// No description provided for @otpEmailSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'Vamos mandar um código por e-mail para confirmar que é você.'**
  String get otpEmailSubtitle;

  /// No description provided for @otpEmailInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Informe um e-mail válido.'**
  String get otpEmailInvalid;

  /// No description provided for @otpSend.
  ///
  /// In pt, this message translates to:
  /// **'Enviar código'**
  String get otpSend;

  /// No description provided for @otpCodeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Digite o código'**
  String get otpCodeTitle;

  /// No description provided for @otpCodeSentSms.
  ///
  /// In pt, this message translates to:
  /// **'Enviamos 6 dígitos por SMS para {destination}.'**
  String otpCodeSentSms(String destination);

  /// No description provided for @otpCodeSentEmail.
  ///
  /// In pt, this message translates to:
  /// **'Enviamos 6 dígitos por e-mail para {destination}.'**
  String otpCodeSentEmail(String destination);

  /// No description provided for @otpCodeLabel.
  ///
  /// In pt, this message translates to:
  /// **'Código de 6 dígitos'**
  String get otpCodeLabel;

  /// No description provided for @otpNotReceived.
  ///
  /// In pt, this message translates to:
  /// **'Não chegou?'**
  String get otpNotReceived;

  /// No description provided for @otpResendIn.
  ///
  /// In pt, this message translates to:
  /// **'Reenviar em {time}'**
  String otpResendIn(String time);

  /// No description provided for @otpResend.
  ///
  /// In pt, this message translates to:
  /// **'Reenviar código'**
  String get otpResend;

  /// No description provided for @otpSendIn.
  ///
  /// In pt, this message translates to:
  /// **'Enviar código em {time}'**
  String otpSendIn(String time);

  /// No description provided for @otpAccountConfirmed.
  ///
  /// In pt, this message translates to:
  /// **'Conta confirmada. Enviamos um novo código para entrar.'**
  String get otpAccountConfirmed;

  /// No description provided for @otpResent.
  ///
  /// In pt, this message translates to:
  /// **'Enviamos um novo código.'**
  String get otpResent;

  /// No description provided for @otpConfirm.
  ///
  /// In pt, this message translates to:
  /// **'Confirmar'**
  String get otpConfirm;

  /// No description provided for @otpEditDestination.
  ///
  /// In pt, this message translates to:
  /// **'Corrigir'**
  String get otpEditDestination;

  /// No description provided for @otpDevHint.
  ///
  /// In pt, this message translates to:
  /// **'Modo dev: o código é 123456.'**
  String get otpDevHint;

  /// No description provided for @otpErrorInvalid.
  ///
  /// In pt, this message translates to:
  /// **'Código inválido. Confira e tente de novo.'**
  String get otpErrorInvalid;

  /// No description provided for @otpErrorExpired.
  ///
  /// In pt, this message translates to:
  /// **'O código expirou. Peça um novo.'**
  String get otpErrorExpired;

  /// No description provided for @otpErrorTooMany.
  ///
  /// In pt, this message translates to:
  /// **'Muitas tentativas. Aguarde alguns minutos e tente de novo.'**
  String get otpErrorTooMany;

  /// No description provided for @otpErrorDestination.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos enviar para esse contato. Confira e tente de novo.'**
  String get otpErrorDestination;

  /// No description provided for @cpfInvalidShort.
  ///
  /// In pt, this message translates to:
  /// **'CPF inválido'**
  String get cpfInvalidShort;

  /// No description provided for @docsAlreadySent.
  ///
  /// In pt, this message translates to:
  /// **'Documentos já enviados para análise.'**
  String get docsAlreadySent;

  /// No description provided for @payTitle.
  ///
  /// In pt, this message translates to:
  /// **'Forma de pagamento'**
  String get payTitle;

  /// No description provided for @paySubtitle.
  ///
  /// In pt, this message translates to:
  /// **'O cartão garante a caução. Você também pode pagar a caução por Pix em cada aluguel.'**
  String get paySubtitle;

  /// No description provided for @payPixWallet.
  ///
  /// In pt, this message translates to:
  /// **'Pix + carteira Volti'**
  String get payPixWallet;

  /// No description provided for @payCardMissing.
  ///
  /// In pt, this message translates to:
  /// **'Adicione um cartão para a caução'**
  String get payCardMissing;

  /// No description provided for @payPixExplain.
  ///
  /// In pt, this message translates to:
  /// **'Com Pix, você paga a caução por um QR antes de cada aluguel e ela volta quando você encerra a corrida. Dá para trocar a forma de pagamento a cada aluguel.'**
  String get payPixExplain;

  /// No description provided for @payFinish.
  ///
  /// In pt, this message translates to:
  /// **'Concluir cadastro'**
  String get payFinish;

  /// No description provided for @onboardingSentToast.
  ///
  /// In pt, this message translates to:
  /// **'Cadastro enviado. Verificação em até 2 min.'**
  String get onboardingSentToast;

  /// No description provided for @vehicleCategoryDefault.
  ///
  /// In pt, this message translates to:
  /// **'Moto elétrica'**
  String get vehicleCategoryDefault;

  /// No description provided for @pricePerMinutePlusFee.
  ///
  /// In pt, this message translates to:
  /// **'{price}/min + taxa'**
  String pricePerMinutePlusFee(String price);

  /// No description provided for @promoFirstRideBadge.
  ///
  /// In pt, this message translates to:
  /// **'Grátis na 1ª corrida'**
  String get promoFirstRideBadge;

  /// No description provided for @hornAndFlash.
  ///
  /// In pt, this message translates to:
  /// **'Buzinar e piscar'**
  String get hornAndFlash;

  /// No description provided for @hornNeedsReservation.
  ///
  /// In pt, this message translates to:
  /// **'Reserve a moto para buzinar e piscar.'**
  String get hornNeedsReservation;

  /// No description provided for @navigate.
  ///
  /// In pt, this message translates to:
  /// **'Navegar'**
  String get navigate;

  /// No description provided for @navigateFailed.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir o app de mapas.'**
  String get navigateFailed;

  /// No description provided for @promoCoupon.
  ///
  /// In pt, this message translates to:
  /// **'Cupom promocional'**
  String get promoCoupon;

  /// No description provided for @couponSaved.
  ///
  /// In pt, this message translates to:
  /// **'Cupom guardado. Ele entra na cotação do plano.'**
  String get couponSaved;

  /// No description provided for @couponRemove.
  ///
  /// In pt, this message translates to:
  /// **'Remover cupom'**
  String get couponRemove;

  /// No description provided for @couponSave.
  ///
  /// In pt, this message translates to:
  /// **'Guardar cupom'**
  String get couponSave;

  /// No description provided for @scanQr.
  ///
  /// In pt, this message translates to:
  /// **'Escanear QR'**
  String get scanQr;

  /// No description provided for @reserve.
  ///
  /// In pt, this message translates to:
  /// **'Reservar'**
  String get reserve;

  /// No description provided for @reportVehicleSentText.
  ///
  /// In pt, this message translates to:
  /// **'Recebemos o seu relato. Obrigado por avisar.'**
  String get reportVehicleSentText;

  /// No description provided for @reservationCanceled.
  ///
  /// In pt, this message translates to:
  /// **'Reserva cancelada'**
  String get reservationCanceled;

  /// No description provided for @offlineTitle.
  ///
  /// In pt, this message translates to:
  /// **'Sem conexão'**
  String get offlineTitle;

  /// No description provided for @offlineText.
  ///
  /// In pt, this message translates to:
  /// **'Tentando reconectar. Algumas ações podem falhar.'**
  String get offlineText;

  /// No description provided for @backOnline.
  ///
  /// In pt, this message translates to:
  /// **'Conexão restabelecida'**
  String get backOnline;

  /// No description provided for @torch.
  ///
  /// In pt, this message translates to:
  /// **'Lanterna'**
  String get torch;

  /// No description provided for @scanAimTitle.
  ///
  /// In pt, this message translates to:
  /// **'Aponte para o QR no guidão'**
  String get scanAimTitle;

  /// No description provided for @scanAimText.
  ///
  /// In pt, this message translates to:
  /// **'Ou digite o número da moto.'**
  String get scanAimText;

  /// No description provided for @vehicleFound.
  ///
  /// In pt, this message translates to:
  /// **'Moto {code} encontrada'**
  String vehicleFound(String code);

  /// No description provided for @lookingFor.
  ///
  /// In pt, this message translates to:
  /// **'Procurando {code}'**
  String lookingFor(String code);

  /// No description provided for @planSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'{code} · {model} · {pct}%'**
  String planSubtitle(String code, String model, int pct);

  /// No description provided for @perUnitShort.
  ///
  /// In pt, this message translates to:
  /// **'/{unit}'**
  String perUnitShort(String unit);

  /// No description provided for @unitMinuteShort.
  ///
  /// In pt, this message translates to:
  /// **'min'**
  String get unitMinuteShort;

  /// No description provided for @unitHourShort.
  ///
  /// In pt, this message translates to:
  /// **'hora'**
  String get unitHourShort;

  /// No description provided for @unitDayShort.
  ///
  /// In pt, this message translates to:
  /// **'dia'**
  String get unitDayShort;

  /// No description provided for @unitWeekShort.
  ///
  /// In pt, this message translates to:
  /// **'semana'**
  String get unitWeekShort;

  /// No description provided for @unitMonthShort.
  ///
  /// In pt, this message translates to:
  /// **'mês'**
  String get unitMonthShort;

  /// No description provided for @perRental.
  ///
  /// In pt, this message translates to:
  /// **'/aluguel'**
  String get perRental;

  /// No description provided for @couponOrCredit.
  ///
  /// In pt, this message translates to:
  /// **'Cupom ou crédito'**
  String get couponOrCredit;

  /// No description provided for @walletCredits.
  ///
  /// In pt, this message translates to:
  /// **'Créditos da carteira'**
  String get walletCredits;

  /// No description provided for @walkRouteSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Rota a pé até a moto: {minutes} min, {distance}'**
  String walkRouteSemantics(int minutes, String distance);

  /// No description provided for @thanksForRiding.
  ///
  /// In pt, this message translates to:
  /// **'Obrigado por andar de Volti'**
  String get thanksForRiding;

  /// No description provided for @depotCardTitle.
  ///
  /// In pt, this message translates to:
  /// **'Galpão Volti · {district}'**
  String depotCardTitle(String district);

  /// No description provided for @depotAvailable.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{nenhuma moto disponível} =1{1 moto disponível} other{{count} motos disponíveis}}'**
  String depotAvailable(int count);

  /// No description provided for @depotOpenUntil.
  ///
  /// In pt, this message translates to:
  /// **'Aberto até {time}'**
  String depotOpenUntil(String time);

  /// No description provided for @depotClosedOpens.
  ///
  /// In pt, this message translates to:
  /// **'Fechado · abre {day} às {time}'**
  String depotClosedOpens(String day, String time);

  /// No description provided for @depotClosed.
  ///
  /// In pt, this message translates to:
  /// **'Fechado'**
  String get depotClosed;

  /// No description provided for @dayToday.
  ///
  /// In pt, this message translates to:
  /// **'Hoje'**
  String get dayToday;

  /// No description provided for @dayTomorrow.
  ///
  /// In pt, this message translates to:
  /// **'Amanhã'**
  String get dayTomorrow;

  /// No description provided for @dayTodayLower.
  ///
  /// In pt, this message translates to:
  /// **'hoje'**
  String get dayTodayLower;

  /// No description provided for @dayTomorrowLower.
  ///
  /// In pt, this message translates to:
  /// **'amanhã'**
  String get dayTomorrowLower;

  /// No description provided for @weekdayShort.
  ///
  /// In pt, this message translates to:
  /// **'{weekday, select, 0{dom.} 1{seg.} 2{ter.} 3{qua.} 4{qui.} 5{sex.} 6{sáb.} other{}}'**
  String weekdayShort(String weekday);

  /// No description provided for @dayChip.
  ///
  /// In pt, this message translates to:
  /// **'{weekday} {date}'**
  String dayChip(String weekday, String date);

  /// No description provided for @dayChipClosed.
  ///
  /// In pt, this message translates to:
  /// **'{label} · Fechado'**
  String dayChipClosed(String label);

  /// No description provided for @depotPicker.
  ///
  /// In pt, this message translates to:
  /// **'Escolha o galpão'**
  String get depotPicker;

  /// No description provided for @depotOptionSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{name}, {distance}'**
  String depotOptionSemantics(String name, String distance);

  /// No description provided for @depotPinSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Galpão {name}'**
  String depotPinSemantics(String name);

  /// No description provided for @swapStationSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Estação de troca de bateria {name}'**
  String swapStationSemantics(String name);

  /// No description provided for @depotsEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum galpão disponível'**
  String get depotsEmpty;

  /// No description provided for @depotsEmptyText.
  ///
  /// In pt, this message translates to:
  /// **'Tente de novo em instantes.'**
  String get depotsEmptyText;

  /// No description provided for @pickDepotCount.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{Nenhuma moto no galpão} =1{1 moto no galpão} other{{count} motos no galpão}}'**
  String pickDepotCount(int count);

  /// No description provided for @pickDepotEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma moto no galpão agora'**
  String get pickDepotEmpty;

  /// No description provided for @pickDepotEmptyText.
  ///
  /// In pt, this message translates to:
  /// **'Volte mais tarde ou escolha outro galpão.'**
  String get pickDepotEmptyText;

  /// No description provided for @planOtherOptions.
  ///
  /// In pt, this message translates to:
  /// **'Outras opções'**
  String get planOtherOptions;

  /// No description provided for @planRenews.
  ///
  /// In pt, this message translates to:
  /// **'Renova automaticamente, cancele quando quiser'**
  String get planRenews;

  /// No description provided for @planChargedAtPickup.
  ///
  /// In pt, this message translates to:
  /// **'O plano é acertado no fim do aluguel; a caução fica como garantia.'**
  String get planChargedAtPickup;

  /// No description provided for @vehicleModelCode.
  ///
  /// In pt, this message translates to:
  /// **'{model} · {code}'**
  String vehicleModelCode(String model, String code);

  /// No description provided for @insuranceTitle.
  ///
  /// In pt, this message translates to:
  /// **'Seguro'**
  String get insuranceTitle;

  /// No description provided for @insuranceSubtitle.
  ///
  /// In pt, this message translates to:
  /// **'O básico já vem incluído. O completo é opcional.'**
  String get insuranceSubtitle;

  /// No description provided for @pickupTitle.
  ///
  /// In pt, this message translates to:
  /// **'Retirada'**
  String get pickupTitle;

  /// No description provided for @pickupNow.
  ///
  /// In pt, this message translates to:
  /// **'Retirar agora'**
  String get pickupNow;

  /// No description provided for @pickupNowUntil.
  ///
  /// In pt, this message translates to:
  /// **'Até {time}'**
  String pickupNowUntil(String time);

  /// No description provided for @pickupNowClosed.
  ///
  /// In pt, this message translates to:
  /// **'O galpão está fechado agora'**
  String get pickupNowClosed;

  /// No description provided for @pickupSchedule.
  ///
  /// In pt, this message translates to:
  /// **'Agendar'**
  String get pickupSchedule;

  /// No description provided for @pickupScheduleHint.
  ///
  /// In pt, this message translates to:
  /// **'Escolha dia e hora no funcionamento do galpão'**
  String get pickupScheduleHint;

  /// No description provided for @pickupDay.
  ///
  /// In pt, this message translates to:
  /// **'Dia'**
  String get pickupDay;

  /// No description provided for @pickupTime.
  ///
  /// In pt, this message translates to:
  /// **'Horário'**
  String get pickupTime;

  /// No description provided for @pickupNoSlots.
  ///
  /// In pt, this message translates to:
  /// **'Sem horários neste dia'**
  String get pickupNoSlots;

  /// No description provided for @pickupChooseTime.
  ///
  /// In pt, this message translates to:
  /// **'Escolha um horário'**
  String get pickupChooseTime;

  /// No description provided for @pickupPlan.
  ///
  /// In pt, this message translates to:
  /// **'Plano'**
  String get pickupPlan;

  /// No description provided for @pickupDepositNote.
  ///
  /// In pt, this message translates to:
  /// **'Confirmar bloqueia só a caução. O plano é acertado no fim do aluguel; a caução fica como garantia.'**
  String get pickupDepositNote;

  /// No description provided for @confirmReservation.
  ///
  /// In pt, this message translates to:
  /// **'Confirmar reserva'**
  String get confirmReservation;

  /// No description provided for @vehicleJustTaken.
  ///
  /// In pt, this message translates to:
  /// **'Essa moto acabou de ser reservada'**
  String get vehicleJustTaken;

  /// No description provided for @depotReservationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Reserva confirmada'**
  String get depotReservationTitle;

  /// No description provided for @reservationQrHint.
  ///
  /// In pt, this message translates to:
  /// **'Mostre este código no galpão'**
  String get reservationQrHint;

  /// No description provided for @reservationQrLabel.
  ///
  /// In pt, this message translates to:
  /// **'QR da reserva'**
  String get reservationQrLabel;

  /// No description provided for @reservationPickupUntil.
  ///
  /// In pt, this message translates to:
  /// **'Retire até {time}'**
  String reservationPickupUntil(String time);

  /// No description provided for @reservationScheduledAt.
  ///
  /// In pt, this message translates to:
  /// **'Retirada {day} às {time}'**
  String reservationScheduledAt(String day, String time);

  /// No description provided for @reservationGrace.
  ///
  /// In pt, this message translates to:
  /// **'Tolerância até {time}'**
  String reservationGrace(String time);

  /// No description provided for @howToGetThere.
  ///
  /// In pt, this message translates to:
  /// **'Como chegar'**
  String get howToGetThere;

  /// No description provided for @cancelReservation.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar reserva'**
  String get cancelReservation;

  /// No description provided for @cancelReservationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar reserva?'**
  String get cancelReservationTitle;

  /// No description provided for @cancelReservationText.
  ///
  /// In pt, this message translates to:
  /// **'O cancelamento é grátis e a caução é liberada.'**
  String get cancelReservationText;

  /// No description provided for @keepReservation.
  ///
  /// In pt, this message translates to:
  /// **'Manter reserva'**
  String get keepReservation;

  /// No description provided for @reservationInHandover.
  ///
  /// In pt, this message translates to:
  /// **'Sua moto já está sendo entregue. Use Apontar problema.'**
  String get reservationInHandover;

  /// No description provided for @reservationPixPending.
  ///
  /// In pt, this message translates to:
  /// **'Pague a caução por Pix para garantir a moto.'**
  String get reservationPixPending;

  /// No description provided for @payPixDeposit.
  ///
  /// In pt, this message translates to:
  /// **'Pagar caução Pix'**
  String get payPixDeposit;

  /// No description provided for @reservationNotFound.
  ///
  /// In pt, this message translates to:
  /// **'Reserva não encontrada'**
  String get reservationNotFound;

  /// No description provided for @reservationNotFoundText.
  ///
  /// In pt, this message translates to:
  /// **'Ela pode ter sido cancelada ou expirado.'**
  String get reservationNotFoundText;

  /// No description provided for @goHome.
  ///
  /// In pt, this message translates to:
  /// **'Ir para o início'**
  String get goHome;

  /// No description provided for @planNeedsCard.
  ///
  /// In pt, this message translates to:
  /// **'Adicione um cartão ou escolha Pix para a caução.'**
  String get planNeedsCard;

  /// No description provided for @returnLockTitle.
  ///
  /// In pt, this message translates to:
  /// **'Trave e encerre'**
  String get returnLockTitle;

  /// No description provided for @returnInsideRule.
  ///
  /// In pt, this message translates to:
  /// **'Você está num ponto verde. Pode encerrar sem taxa.'**
  String get returnInsideRule;

  /// No description provided for @reservationNoCode.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos carregar o QR da reserva. Tente de novo antes de ir ao galpão.'**
  String get reservationNoCode;

  /// No description provided for @handoverTitle.
  ///
  /// In pt, this message translates to:
  /// **'Confira sua moto'**
  String get handoverTitle;

  /// No description provided for @handoverIntro.
  ///
  /// In pt, this message translates to:
  /// **'{operator} separou a {code} para você. Confira as fotos e o checklist antes de aceitar.'**
  String handoverIntro(String operator, String code);

  /// No description provided for @handoverIntroNoOperator.
  ///
  /// In pt, this message translates to:
  /// **'A {code} está pronta. Confira as fotos e o checklist antes de aceitar.'**
  String handoverIntroNoOperator(String code);

  /// No description provided for @handoverPhotos.
  ///
  /// In pt, this message translates to:
  /// **'Fotos da saída'**
  String get handoverPhotos;

  /// No description provided for @handoverPhotoLabel.
  ///
  /// In pt, this message translates to:
  /// **'Foto {n} de {total} da moto'**
  String handoverPhotoLabel(int n, int total);

  /// No description provided for @handoverNoPhotos.
  ///
  /// In pt, this message translates to:
  /// **'Esta entrega veio sem fotos.'**
  String get handoverNoPhotos;

  /// No description provided for @handoverBatterySerial.
  ///
  /// In pt, this message translates to:
  /// **'Bateria nº {serial}'**
  String handoverBatterySerial(String serial);

  /// No description provided for @handoverChecklist.
  ///
  /// In pt, this message translates to:
  /// **'Checklist de saída'**
  String get handoverChecklist;

  /// No description provided for @handoverItemOk.
  ///
  /// In pt, this message translates to:
  /// **'Ok'**
  String get handoverItemOk;

  /// No description provided for @handoverItemProblem.
  ///
  /// In pt, this message translates to:
  /// **'Com problema'**
  String get handoverItemProblem;

  /// No description provided for @handoverItemSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{item}: {state}'**
  String handoverItemSemantics(String item, String state);

  /// No description provided for @handoverItemFreios.
  ///
  /// In pt, this message translates to:
  /// **'Freios'**
  String get handoverItemFreios;

  /// No description provided for @handoverItemLuzes.
  ///
  /// In pt, this message translates to:
  /// **'Luzes'**
  String get handoverItemLuzes;

  /// No description provided for @handoverItemPneus.
  ///
  /// In pt, this message translates to:
  /// **'Pneus'**
  String get handoverItemPneus;

  /// No description provided for @handoverItemBuzina.
  ///
  /// In pt, this message translates to:
  /// **'Buzina'**
  String get handoverItemBuzina;

  /// No description provided for @handoverItemPainel.
  ///
  /// In pt, this message translates to:
  /// **'Painel'**
  String get handoverItemPainel;

  /// No description provided for @handoverItemCarenagem.
  ///
  /// In pt, this message translates to:
  /// **'Carenagem'**
  String get handoverItemCarenagem;

  /// No description provided for @handoverStartsNow.
  ///
  /// In pt, this message translates to:
  /// **'Ao aceitar, o aluguel começa agora e a moto destrava. O plano é acertado no fim do aluguel, com a caução como garantia.'**
  String get handoverStartsNow;

  /// No description provided for @handoverAccept.
  ///
  /// In pt, this message translates to:
  /// **'Aceitar e destravar'**
  String get handoverAccept;

  /// No description provided for @handoverReport.
  ///
  /// In pt, this message translates to:
  /// **'Apontar problema'**
  String get handoverReport;

  /// No description provided for @handoverPaymentDeclined.
  ///
  /// In pt, this message translates to:
  /// **'O pagamento não foi aprovado. Tente de novo ou fale com o operador.'**
  String get handoverPaymentDeclined;

  /// No description provided for @handoverDepositNotHeld.
  ///
  /// In pt, this message translates to:
  /// **'A caução da reserva não está retida. Fale com o suporte.'**
  String get handoverDepositNotHeld;

  /// No description provided for @handoverAcceptFailed.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível aceitar agora. Tente de novo ou fale com o operador.'**
  String get handoverAcceptFailed;

  /// No description provided for @handoverNotFound.
  ///
  /// In pt, this message translates to:
  /// **'Essa entrega não foi encontrada.'**
  String get handoverNotFound;

  /// No description provided for @handoverDisputeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Apontar problema'**
  String get handoverDisputeTitle;

  /// No description provided for @handoverDisputeText.
  ///
  /// In pt, this message translates to:
  /// **'Conte o que está errado. O suporte recebe junto com as fotos da saída.'**
  String get handoverDisputeText;

  /// No description provided for @handoverDisputeLabel.
  ///
  /// In pt, this message translates to:
  /// **'O que está errado com a moto?'**
  String get handoverDisputeLabel;

  /// No description provided for @handoverDisputeHint.
  ///
  /// In pt, this message translates to:
  /// **'Ex.: retrovisor quebrado'**
  String get handoverDisputeHint;

  /// No description provided for @handoverDisputeSend.
  ///
  /// In pt, this message translates to:
  /// **'Enviar ao suporte'**
  String get handoverDisputeSend;

  /// No description provided for @handoverDisputedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Problema apontado'**
  String get handoverDisputedTitle;

  /// No description provided for @handoverDisputedText.
  ///
  /// In pt, this message translates to:
  /// **'O suporte vai falar com você.'**
  String get handoverDisputedText;

  /// No description provided for @handoverDisputedReason.
  ///
  /// In pt, this message translates to:
  /// **'Você disse: {reason}'**
  String handoverDisputedReason(String reason);

  /// No description provided for @handoverAcceptedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Moto liberada'**
  String get handoverAcceptedTitle;

  /// No description provided for @handoverAcceptedText.
  ///
  /// In pt, this message translates to:
  /// **'Seu aluguel já começou.'**
  String get handoverAcceptedText;

  /// No description provided for @handoverGoToRide.
  ///
  /// In pt, this message translates to:
  /// **'Ir para a corrida'**
  String get handoverGoToRide;

  /// No description provided for @handoverCanceledTitle.
  ///
  /// In pt, this message translates to:
  /// **'Entrega cancelada'**
  String get handoverCanceledTitle;

  /// No description provided for @handoverCanceledText.
  ///
  /// In pt, this message translates to:
  /// **'Fale com o operador no galpão.'**
  String get handoverCanceledText;

  /// No description provided for @reservationSeeHandover.
  ///
  /// In pt, this message translates to:
  /// **'Conferir moto'**
  String get reservationSeeHandover;

  /// No description provided for @swapBattery.
  ///
  /// In pt, this message translates to:
  /// **'Trocar bateria'**
  String get swapBattery;

  /// No description provided for @swapBatteryText.
  ///
  /// In pt, this message translates to:
  /// **'Troque no galpão, com o operador, ou numa estação. Toque para abrir a rota.'**
  String get swapBatteryText;

  /// No description provided for @swapAtDepot.
  ///
  /// In pt, this message translates to:
  /// **'Troca com o operador'**
  String get swapAtDepot;

  /// No description provided for @swapAvailable.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{sem baterias disponíveis} =1{1 bateria disponível} other{{count} baterias disponíveis}}'**
  String swapAvailable(int count);

  /// No description provided for @swapStationsEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhuma estação de bateria encontrada.'**
  String get swapStationsEmpty;

  /// No description provided for @swapDirectionsHint.
  ///
  /// In pt, this message translates to:
  /// **'Abre a rota no app de mapas'**
  String get swapDirectionsHint;

  /// No description provided for @returnModePoint.
  ///
  /// In pt, this message translates to:
  /// **'Ponto verde'**
  String get returnModePoint;

  /// No description provided for @returnModeDepot.
  ///
  /// In pt, this message translates to:
  /// **'Galpão'**
  String get returnModeDepot;

  /// No description provided for @returnModeLabel.
  ///
  /// In pt, this message translates to:
  /// **'Onde devolver'**
  String get returnModeLabel;

  /// No description provided for @returnDepotTitle.
  ///
  /// In pt, this message translates to:
  /// **'Devolver no galpão'**
  String get returnDepotTitle;

  /// No description provided for @returnDepotText.
  ///
  /// In pt, this message translates to:
  /// **'Leve a moto ao galpão e entregue ao operador. Ele faz o checklist de chegada e encerra o aluguel; o recibo abre aqui.'**
  String get returnDepotText;

  /// No description provided for @returnDepotWaiting.
  ///
  /// In pt, this message translates to:
  /// **'Aguardando o operador registrar a chegada…'**
  String get returnDepotWaiting;

  /// No description provided for @returnDepotMissing.
  ///
  /// In pt, this message translates to:
  /// **'Não encontramos o galpão. Tente de novo.'**
  String get returnDepotMissing;

  /// No description provided for @pickContinueLabel.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get pickContinueLabel;

  /// No description provided for @pickContinueBike.
  ///
  /// In pt, this message translates to:
  /// **'{model} · {code}'**
  String pickContinueBike(String model, String code);

  /// No description provided for @nearDepot.
  ///
  /// In pt, this message translates to:
  /// **'Perto do {depot}'**
  String nearDepot(String depot);

  /// No description provided for @welcomeTitleLead.
  ///
  /// In pt, this message translates to:
  /// **'Pegue uma moto'**
  String get welcomeTitleLead;

  /// No description provided for @welcomeTitleAccent.
  ///
  /// In pt, this message translates to:
  /// **'e vá.'**
  String get welcomeTitleAccent;

  /// No description provided for @welcomeOr.
  ///
  /// In pt, this message translates to:
  /// **'ou entre com'**
  String get welcomeOr;

  /// No description provided for @welcomeEmail.
  ///
  /// In pt, this message translates to:
  /// **'E-mail'**
  String get welcomeEmail;

  /// No description provided for @welcomeTermsPrefix.
  ///
  /// In pt, this message translates to:
  /// **'Ao continuar, você aceita os '**
  String get welcomeTermsPrefix;

  /// No description provided for @welcomeTermsLink.
  ///
  /// In pt, this message translates to:
  /// **'termos de uso'**
  String get welcomeTermsLink;

  /// No description provided for @welcomeTermsMiddle.
  ///
  /// In pt, this message translates to:
  /// **' e a '**
  String get welcomeTermsMiddle;

  /// No description provided for @welcomePrivacyLink.
  ///
  /// In pt, this message translates to:
  /// **'política de privacidade'**
  String get welcomePrivacyLink;

  /// No description provided for @welcomeTermsSuffix.
  ///
  /// In pt, this message translates to:
  /// **'.'**
  String get welcomeTermsSuffix;

  /// No description provided for @welcomeLegalUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'Este documento ainda não está publicado neste ambiente.'**
  String get welcomeLegalUnavailable;

  /// No description provided for @welcomeLegalOpenError.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir o link. Tente de novo.'**
  String get welcomeLegalOpenError;

  /// Leitor de tela: botao ocupado (loading)
  ///
  /// In pt, this message translates to:
  /// **'Carregando…'**
  String get buttonBusy;

  /// Leitor de tela: botao no estado de sucesso
  ///
  /// In pt, this message translates to:
  /// **'Concluído'**
  String get buttonDone;

  /// No description provided for @welcomeHeroPickupTitle.
  ///
  /// In pt, this message translates to:
  /// **'Retire no galpão'**
  String get welcomeHeroPickupTitle;

  /// No description provided for @welcomeHeroPickupText.
  ///
  /// In pt, this message translates to:
  /// **'Escolha no app, retire no galpão'**
  String get welcomeHeroPickupText;

  /// No description provided for @welcomeHeroPlansTitle.
  ///
  /// In pt, this message translates to:
  /// **'Planos diário, semanal e mensal'**
  String get welcomeHeroPlansTitle;

  /// No description provided for @welcomeHeroPlansText.
  ///
  /// In pt, this message translates to:
  /// **'ou por minuto e hora'**
  String get welcomeHeroPlansText;

  /// No description provided for @welcomeHeroInsuranceTitle.
  ///
  /// In pt, this message translates to:
  /// **'Seguro incluso'**
  String get welcomeHeroInsuranceTitle;

  /// No description provided for @welcomeHeroInsuranceText.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria no galpão e nas estações'**
  String get welcomeHeroInsuranceText;

  /// No description provided for @pickDetails.
  ///
  /// In pt, this message translates to:
  /// **'Ver detalhes'**
  String get pickDetails;

  /// No description provided for @pickCollapse.
  ///
  /// In pt, this message translates to:
  /// **'Recolher'**
  String get pickCollapse;

  /// No description provided for @pickSpecCategory.
  ///
  /// In pt, this message translates to:
  /// **'Categoria'**
  String get pickSpecCategory;

  /// No description provided for @pickSpecPower.
  ///
  /// In pt, this message translates to:
  /// **'Potência'**
  String get pickSpecPower;

  /// No description provided for @pickSpecSpeed.
  ///
  /// In pt, this message translates to:
  /// **'Velocidade máxima'**
  String get pickSpecSpeed;

  /// No description provided for @pickSpecBattery.
  ///
  /// In pt, this message translates to:
  /// **'Bateria e autonomia'**
  String get pickSpecBattery;

  /// No description provided for @pickSpecBatteryValue.
  ///
  /// In pt, this message translates to:
  /// **'{pct}% · ~{km} km'**
  String pickSpecBatteryValue(int pct, int km);

  /// No description provided for @pickSpecPrice.
  ///
  /// In pt, this message translates to:
  /// **'Preço por minuto'**
  String get pickSpecPrice;

  /// No description provided for @pickSpecUnlock.
  ///
  /// In pt, this message translates to:
  /// **'Taxa de desbloqueio'**
  String get pickSpecUnlock;

  /// No description provided for @pickSpecCode.
  ///
  /// In pt, this message translates to:
  /// **'Código'**
  String get pickSpecCode;

  /// No description provided for @pickDetailsShort.
  ///
  /// In pt, this message translates to:
  /// **'Detalhes'**
  String get pickDetailsShort;

  /// No description provided for @stationsToggle.
  ///
  /// In pt, this message translates to:
  /// **'Pontos de troca de bateria'**
  String get stationsToggle;

  /// No description provided for @stationsSheetTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria'**
  String get stationsSheetTitle;

  /// No description provided for @stationsEmpty.
  ///
  /// In pt, this message translates to:
  /// **'Nenhum ponto de troca por perto'**
  String get stationsEmpty;

  /// No description provided for @stationAvailability.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{Sem baterias no momento} =1{1 bateria disponível} other{{count} baterias disponíveis}}'**
  String stationAvailability(int count);

  /// No description provided for @stationOpen24h.
  ///
  /// In pt, this message translates to:
  /// **'Aberto 24h'**
  String get stationOpen24h;

  /// No description provided for @stationShowOnMapHint.
  ///
  /// In pt, this message translates to:
  /// **'Mostra o ponto no mapa'**
  String get stationShowOnMapHint;

  /// No description provided for @stationMarkerSemantics.
  ///
  /// In pt, this message translates to:
  /// **'{name}: {availability}'**
  String stationMarkerSemantics(String name, String availability);

  /// No description provided for @stationDirectionsSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Como chegar a {name}'**
  String stationDirectionsSemantics(String name);

  /// No description provided for @stationsCloseSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Fechar pontos de troca'**
  String get stationsCloseSemantics;

  /// No description provided for @homeReservationTitle.
  ///
  /// In pt, this message translates to:
  /// **'Sua reserva'**
  String get homeReservationTitle;

  /// No description provided for @homeReservationScheduled.
  ///
  /// In pt, this message translates to:
  /// **'Retirada agendada · {day} às {time}'**
  String homeReservationScheduled(String day, String time);

  /// No description provided for @homeReservationHandover.
  ///
  /// In pt, this message translates to:
  /// **'Sua moto está sendo entregue'**
  String get homeReservationHandover;

  /// No description provided for @homeReservationExpired.
  ///
  /// In pt, this message translates to:
  /// **'O prazo de retirada acabou'**
  String get homeReservationExpired;

  /// No description provided for @homeReservationShowQr.
  ///
  /// In pt, this message translates to:
  /// **'Ver QR da reserva'**
  String get homeReservationShowQr;

  /// No description provided for @homeReservationRemaining.
  ///
  /// In pt, this message translates to:
  /// **'{minutes, plural, =0{Falta menos de 1 minuto} =1{Falta 1 minuto} other{Faltam {minutes} minutos}}'**
  String homeReservationRemaining(int minutes);

  /// No description provided for @homeReservationA11yNow.
  ///
  /// In pt, this message translates to:
  /// **'Reserva da {vehicle}, retire até {time}'**
  String homeReservationA11yNow(String vehicle, String time);

  /// No description provided for @homeReservationA11yScheduled.
  ///
  /// In pt, this message translates to:
  /// **'Reserva da {vehicle}, retirada agendada {day} às {time}'**
  String homeReservationA11yScheduled(String vehicle, String day, String time);

  /// No description provided for @homeReservationA11yHandover.
  ///
  /// In pt, this message translates to:
  /// **'Reserva da {vehicle}, sua moto está sendo entregue'**
  String homeReservationA11yHandover(String vehicle);

  /// No description provided for @homeReservationA11yExpired.
  ///
  /// In pt, this message translates to:
  /// **'Reserva da {vehicle}, o prazo de retirada acabou'**
  String homeReservationA11yExpired(String vehicle);

  /// No description provided for @swapNearbyTitle.
  ///
  /// In pt, this message translates to:
  /// **'Você está na {station}'**
  String swapNearbyTitle(String station);

  /// No description provided for @swapNearbyAction.
  ///
  /// In pt, this message translates to:
  /// **'Trocar bateria'**
  String get swapNearbyAction;

  /// No description provided for @swapHere.
  ///
  /// In pt, this message translates to:
  /// **'Trocar aqui'**
  String get swapHere;

  /// No description provided for @swapHereSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Trocar a bateria na {station}'**
  String swapHereSemantics(String station);

  /// No description provided for @swapResumeTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria em andamento'**
  String get swapResumeTitle;

  /// No description provided for @swapResumeText.
  ///
  /// In pt, this message translates to:
  /// **'Toque para ver em que passo está.'**
  String get swapResumeText;

  /// No description provided for @swapResumeAction.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get swapResumeAction;

  /// No description provided for @swapScanTitle.
  ///
  /// In pt, this message translates to:
  /// **'Escanear QR da estação'**
  String get swapScanTitle;

  /// No description provided for @swapScanHint.
  ///
  /// In pt, this message translates to:
  /// **'Aponte a câmera para o QR colado na estação.'**
  String get swapScanHint;

  /// No description provided for @swapScanDenied.
  ///
  /// In pt, this message translates to:
  /// **'Sem acesso à câmera. Permita a câmera nas configurações do aparelho ou digite o código impresso abaixo do QR.'**
  String get swapScanDenied;

  /// No description provided for @swapScanUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'Não foi possível abrir a câmera. Digite o código impresso abaixo do QR.'**
  String get swapScanUnavailable;

  /// No description provided for @swapManualLabel.
  ///
  /// In pt, this message translates to:
  /// **'Código da estação'**
  String get swapManualLabel;

  /// No description provided for @swapManualHint.
  ///
  /// In pt, this message translates to:
  /// **'Ex.: vst1.…'**
  String get swapManualHint;

  /// No description provided for @swapManualContinue.
  ///
  /// In pt, this message translates to:
  /// **'Continuar'**
  String get swapManualContinue;

  /// No description provided for @swapManualToggle.
  ///
  /// In pt, this message translates to:
  /// **'Digitar o código'**
  String get swapManualToggle;

  /// No description provided for @swapConfirmTitle.
  ///
  /// In pt, this message translates to:
  /// **'Trocar a bateria da {vehicle} aqui?'**
  String swapConfirmTitle(String vehicle);

  /// No description provided for @swapConfirmAvailable.
  ///
  /// In pt, this message translates to:
  /// **'{count, plural, =0{Baterias disponíveis: nenhuma} =1{Baterias disponíveis: 1} other{Baterias disponíveis: {count}}}'**
  String swapConfirmAvailable(int count);

  /// No description provided for @swapConfirmFeeLine.
  ///
  /// In pt, this message translates to:
  /// **'Taxa por troca no seu plano, cobrada no fechamento do aluguel.'**
  String get swapConfirmFeeLine;

  /// No description provided for @swapConfirmFeeAmount.
  ///
  /// In pt, this message translates to:
  /// **'Taxa {amount}'**
  String swapConfirmFeeAmount(String amount);

  /// No description provided for @swapConfirmSteps.
  ///
  /// In pt, this message translates to:
  /// **'A estação abre uma vaga vazia: devolva a bateria descarregada e pegue a carregada que ela liberar.'**
  String get swapConfirmSteps;

  /// No description provided for @swapOpenSlot.
  ///
  /// In pt, this message translates to:
  /// **'Abrir compartimento'**
  String get swapOpenSlot;

  /// No description provided for @swapSeeOpen.
  ///
  /// In pt, this message translates to:
  /// **'Ver troca em andamento'**
  String get swapSeeOpen;

  /// No description provided for @swapLocationNeeded.
  ///
  /// In pt, this message translates to:
  /// **'Precisamos da sua localização para confirmar que você está na estação.'**
  String get swapLocationNeeded;

  /// No description provided for @swapErrorInvalidQr.
  ///
  /// In pt, this message translates to:
  /// **'QR inválido. Confira se é o QR de uma estação Volti.'**
  String get swapErrorInvalidQr;

  /// No description provided for @swapErrorTooFar.
  ///
  /// In pt, this message translates to:
  /// **'Você precisa estar a até 50 m da estação. Chegue mais perto e tente de novo.'**
  String get swapErrorTooFar;

  /// No description provided for @swapErrorMoving.
  ///
  /// In pt, this message translates to:
  /// **'Pare e trave a moto antes de trocar a bateria.'**
  String get swapErrorMoving;

  /// No description provided for @swapErrorNoBattery.
  ///
  /// In pt, this message translates to:
  /// **'Esta estação está sem baterias carregadas agora. Tente outra estação.'**
  String get swapErrorNoBattery;

  /// No description provided for @swapErrorClosed.
  ///
  /// In pt, this message translates to:
  /// **'Esta estação está fechada agora ({hours}).'**
  String swapErrorClosed(String hours);

  /// No description provided for @swapErrorUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'Esta estação não está disponível agora. Tente outra estação.'**
  String get swapErrorUnavailable;

  /// No description provided for @swapErrorOpen.
  ///
  /// In pt, this message translates to:
  /// **'Você já tem uma troca de bateria em andamento.'**
  String get swapErrorOpen;

  /// No description provided for @swapErrorRentalNotActive.
  ///
  /// In pt, this message translates to:
  /// **'A troca só pode ser feita com um aluguel em andamento.'**
  String get swapErrorRentalNotActive;

  /// No description provided for @swapNoRental.
  ///
  /// In pt, this message translates to:
  /// **'Você precisa de um aluguel em andamento para trocar a bateria.'**
  String get swapNoRental;

  /// No description provided for @swapProgressTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca de bateria'**
  String get swapProgressTitle;

  /// No description provided for @swapStepOpening.
  ///
  /// In pt, this message translates to:
  /// **'Abrindo uma vaga…'**
  String get swapStepOpening;

  /// No description provided for @swapStepOpeningText.
  ///
  /// In pt, this message translates to:
  /// **'A estação está abrindo uma vaga vazia para você.'**
  String get swapStepOpeningText;

  /// No description provided for @swapStepAwaiting.
  ///
  /// In pt, this message translates to:
  /// **'Devolva a bateria na vaga {slot}'**
  String swapStepAwaiting(int slot);

  /// No description provided for @swapStepAwaitingNoSlot.
  ///
  /// In pt, this message translates to:
  /// **'Devolva a bateria na vaga aberta'**
  String get swapStepAwaitingNoSlot;

  /// No description provided for @swapStepAwaitingText.
  ///
  /// In pt, this message translates to:
  /// **'Tire a bateria descarregada da moto, coloque na vaga e feche a porta.'**
  String get swapStepAwaitingText;

  /// No description provided for @swapStepReturned.
  ///
  /// In pt, this message translates to:
  /// **'Bateria recebida'**
  String get swapStepReturned;

  /// No description provided for @swapStepReturnedText.
  ///
  /// In pt, this message translates to:
  /// **'Feche a porta da vaga. A estação vai liberar uma bateria carregada.'**
  String get swapStepReturnedText;

  /// No description provided for @swapStepReleasing.
  ///
  /// In pt, this message translates to:
  /// **'Pegue a bateria carregada'**
  String get swapStepReleasing;

  /// No description provided for @swapStepReleasingText.
  ///
  /// In pt, this message translates to:
  /// **'Retire a bateria liberada e encaixe na moto.'**
  String get swapStepReleasingText;

  /// No description provided for @swapDoneTitle.
  ///
  /// In pt, this message translates to:
  /// **'Bateria trocada · {pct}%'**
  String swapDoneTitle(int pct);

  /// No description provided for @swapDoneText.
  ///
  /// In pt, this message translates to:
  /// **'Tudo certo. A autonomia da moto já foi atualizada.'**
  String get swapDoneText;

  /// No description provided for @swapStepSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Passo {current} de {total}'**
  String swapStepSemantics(int current, int total);

  /// No description provided for @swapTimeLeft.
  ///
  /// In pt, this message translates to:
  /// **'Prazo: {time}'**
  String swapTimeLeft(String time);

  /// No description provided for @swapTimeUp.
  ///
  /// In pt, this message translates to:
  /// **'Aguardando a estação…'**
  String get swapTimeUp;

  /// No description provided for @swapFeeNote.
  ///
  /// In pt, this message translates to:
  /// **'Taxa {amount} · cobrada no fechamento do aluguel'**
  String swapFeeNote(String amount);

  /// No description provided for @swapCancel.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar troca'**
  String get swapCancel;

  /// No description provided for @swapCancelConfirmTitle.
  ///
  /// In pt, this message translates to:
  /// **'Cancelar a troca?'**
  String get swapCancelConfirmTitle;

  /// No description provided for @swapCancelConfirmText.
  ///
  /// In pt, this message translates to:
  /// **'A vaga será fechada. Se você já colocou a bateria, a estação libera uma carregada mesmo assim.'**
  String get swapCancelConfirmText;

  /// No description provided for @swapCancelKeep.
  ///
  /// In pt, this message translates to:
  /// **'Continuar troca'**
  String get swapCancelKeep;

  /// No description provided for @swapCanceledTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca cancelada'**
  String get swapCanceledTitle;

  /// No description provided for @swapFailedTitle.
  ///
  /// In pt, this message translates to:
  /// **'Troca não concluída'**
  String get swapFailedTitle;

  /// No description provided for @swapEndCanceledByCustomer.
  ///
  /// In pt, this message translates to:
  /// **'Você cancelou a troca. Nenhuma bateria foi trocada.'**
  String get swapEndCanceledByCustomer;

  /// No description provided for @swapEndSlotClosed.
  ///
  /// In pt, this message translates to:
  /// **'A vaga fechou sem a bateria. Tente de novo quando quiser.'**
  String get swapEndSlotClosed;

  /// No description provided for @swapEndStationTimeout.
  ///
  /// In pt, this message translates to:
  /// **'A estação não respondeu a tempo. Tente de novo ou use outra estação.'**
  String get swapEndStationTimeout;

  /// No description provided for @swapEndReturnTimeout.
  ///
  /// In pt, this message translates to:
  /// **'O tempo para devolver a bateria acabou.'**
  String get swapEndReturnTimeout;

  /// No description provided for @swapEndReleaseTimeout.
  ///
  /// In pt, this message translates to:
  /// **'A estação recebeu sua bateria, mas não liberou a carregada. Já avisamos a equipe; fale com o suporte se precisar.'**
  String get swapEndReleaseTimeout;

  /// No description provided for @swapEndNoBatteryAfterReturn.
  ///
  /// In pt, this message translates to:
  /// **'Sua bateria foi recebida, mas não havia bateria carregada para liberar. Nossa equipe já foi avisada; fale com o suporte.'**
  String get swapEndNoBatteryAfterReturn;

  /// No description provided for @swapEndSerialMismatch.
  ///
  /// In pt, this message translates to:
  /// **'Não conseguimos confirmar a bateria da estação. Fale com o suporte.'**
  String get swapEndSerialMismatch;

  /// No description provided for @swapEndGeneric.
  ///
  /// In pt, this message translates to:
  /// **'A troca não foi concluída. Tente de novo.'**
  String get swapEndGeneric;

  /// No description provided for @swapLateReturnNote.
  ///
  /// In pt, this message translates to:
  /// **'Se você já colocou a bateria na vaga, a estação ainda libera uma carregada. Esta tela atualiza sozinha.'**
  String get swapLateReturnNote;

  /// No description provided for @swapBackToRide.
  ///
  /// In pt, this message translates to:
  /// **'Voltar à corrida'**
  String get swapBackToRide;

  /// No description provided for @swapCountdownSemantics.
  ///
  /// In pt, this message translates to:
  /// **'Tempo restante: {time}'**
  String swapCountdownSemantics(String time);

  /// No description provided for @swapEndReturnAfterClose.
  ///
  /// In pt, this message translates to:
  /// **'Sua bateria foi recebida depois que a troca foi encerrada. Nossa equipe de operação já foi avisada; fale com o suporte se precisar.'**
  String get swapEndReturnAfterClose;

  /// No description provided for @swapEndRentalForceEnded.
  ///
  /// In pt, this message translates to:
  /// **'O aluguel foi encerrado pela equipe Volti, então a troca foi cancelada.'**
  String get swapEndRentalForceEnded;

  /// No description provided for @swapScanStation.
  ///
  /// In pt, this message translates to:
  /// **'Estação: {name}'**
  String swapScanStation(String name);

  /// No description provided for @returnSwapOpenAction.
  ///
  /// In pt, this message translates to:
  /// **'Continuar troca'**
  String get returnSwapOpenAction;

  /// No description provided for @termsOfUse.
  ///
  /// In pt, this message translates to:
  /// **'Termos de uso'**
  String get termsOfUse;

  /// No description provided for @privacyPolicy.
  ///
  /// In pt, this message translates to:
  /// **'Política de privacidade'**
  String get privacyPolicy;

  /// No description provided for @couponUpTo.
  ///
  /// In pt, this message translates to:
  /// **'até {amount}'**
  String couponUpTo(String amount);

  /// No description provided for @couponPercentOfTime.
  ///
  /// In pt, this message translates to:
  /// **'-{percent}% do tempo'**
  String couponPercentOfTime(int percent);

  /// No description provided for @couponClosingNote.
  ///
  /// In pt, this message translates to:
  /// **'O desconto é aplicado no fechamento do aluguel, limitado ao valor do tempo de uso.'**
  String get couponClosingNote;

  /// No description provided for @fixCpf.
  ///
  /// In pt, this message translates to:
  /// **'Corrigir CPF'**
  String get fixCpf;

  /// No description provided for @cpfAlreadyUsed.
  ///
  /// In pt, this message translates to:
  /// **'Este CPF já está cadastrado em outra conta.'**
  String get cpfAlreadyUsed;

  /// No description provided for @dayChipEnded.
  ///
  /// In pt, this message translates to:
  /// **'{label} · Encerrado'**
  String dayChipEnded(String label);

  /// No description provided for @dayChipUnavailable.
  ///
  /// In pt, this message translates to:
  /// **'{label} · Indisponível'**
  String dayChipUnavailable(String label);

  /// No description provided for @accountUnread.
  ///
  /// In pt, this message translates to:
  /// **'Conta, mensagens novas do suporte'**
  String get accountUnread;
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
