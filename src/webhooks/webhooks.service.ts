import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPayHereSignature } from '../shared/utils/signature-verifier';
import { parsePayHerePayload } from './parsers/payhere.webhook-parser';

const log = new Logger('WebhooksService');

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly STATUS_MAP: Record<number, string> = {
    2: 'SUCCEEDED',
    '-1': 'FAILED',
    '-2': 'CANCELLED',
    '-3': 'DISPUTED',
  };

  private mapPayHereStatus(code: number | string): string {
    return this.STATUS_MAP[Number(code)] || 'PENDING';
  }

  async handlePayHereWebhook(rawBody: string, headers: Record<string, any>) {
    const merchantId = process.env.PAYHERE_MERCHANT_ID ?? '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? '';

    const signatureHeader =
      headers.authorization ||
      headers['x-payhere-signature'] ||
      headers['x-signature'];
    if (
      !verifyPayHereSignature(
        rawBody,
        signatureHeader,
        merchantId,
        merchantSecret,
      )
    ) {
      log.warn('Invalid PayHere signature');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const parsed = parsePayHerePayload(rawBody);
    const status = this.mapPayHereStatus(parsed.statusCode);
    const pspPaymentId = parsed.pspPaymentId;
    if (!pspPaymentId) {
      log.warn('PayHere webhook missing payment id', parsed);
      throw new HttpException('Missing payment id', HttpStatus.BAD_REQUEST);
    }

    // Idempotency prevention: check if we already recorded an event with same pspPaymentId + event_type
    const existingEvent = await this.prisma.paymentEvent.findFirst({
      where: {
        payload: { path: ['pspPaymentId'], equals: pspPaymentId },
        eventType: 'webhook.received',
      },
    });

    if (existingEvent) {
      log.log(
        `Duplicate webhook received for pspPaymentId=${pspPaymentId}, ignoring`,
      );
      return { ok: true, duplicate: true };
    }

    // Find corresponding payment by psp_payment_id or bookingId
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ pspPaymentId }, { bookingId: parsed.orderId }],
      },
    });

    // If payment not found, create an audit record and return 202
    if (!payment) {
      await (this.prisma as any).webhookAuditLog
        .create({
          data: {
            eventSource: 'payhere',
            payload: { parsed },
            reason: 'payment_not_found',
          },
        })
        .catch((err: any) =>
          log.warn('Failed to write webhook audit log', err),
        );

      log.warn('Webhook for unknown payment', pspPaymentId);
      return { ok: true, note: 'unknown_payment' };
    }

    // Update payment status and write audit event atomically
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          pspPaymentId,
          pspReference: parsed.raw?.merchant_reference || parsed.raw?.reference,
          updatedAt: new Date(),
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'webhook.received',
          eventSource: 'payhere',
          payload: { parsed },
          statusBefore: payment.status,
          statusAfter: status,
        },
      });
    });

    // TODO: emit message to message broker (RabbitMQ) e.g., payment.succeeded / payment.failed
    log.log(`Processed PayHere webhook for payment ${payment.id} -> ${status}`);

    return { ok: true };
  }
}
