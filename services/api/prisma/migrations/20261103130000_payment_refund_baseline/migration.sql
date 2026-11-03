-- Auditoria run-4 onda 2: linha de base do estorno no gateway. O id do pagamento no gateway pode ser compartilhado (Pix da
-- caução que pagou o aluguel: excedente estornado + Payment do aluguel), então o total estornado no gateway sozinho não
-- prova que ESTE pedido foi estornado. Pedidos antigos ficam com NULL (a reconciliação trata à parte).
-- Não espera atrás de consulta longa segurando a fila da tabela: falha rápido e o deploy é refeito.
SET lock_timeout = '5s';
ALTER TABLE "PaymentRefund" ADD COLUMN "gatewayRefundedBefore" INTEGER;
