import { Global, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

/** Carteira (Task 5): ledger somente inserção; recargas pelo `PaymentProvider`. Global para o consumidor de webhooks. */
@Global()
@Module({ controllers: [WalletController], providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
