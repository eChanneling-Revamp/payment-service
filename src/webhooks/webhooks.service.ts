import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRepository } from '../persistence/repositories/payment.repository';
import { EventRepository } from '../persistence/repositories/event.repository';
import {
  verifyPayHereNotification,
  parsePayHerePayload,
  mapPayHereStatus,
  verifyPayHereHmac,
} from '../psp-adapters/payhere.adapter';

const log = new Logger('WebhooksService');

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepo: PaymentRepository,
    private readonly eventRepo: EventRepository,
  ) { }

  async handlePayHereWebhook(rawBody: string, headers: Record<string, any>) {
    const merchantId = process.env.PAYHERE_MERCHANT_ID ?? '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? '';

    //  'x-signature' or 'X-Signature' in Node headers
    const signature = headers['x-signature'] || headers['X-Signature'];

    // If no signature found, we might want to fallback or fail.
    // The requirement is strict on HMAC verification for new webhooks.
    // If no signature found, we might want to fallback or fail.
    // The requirement is strict on HMAC verification for new webhooks.
    if (!signature) {
      log.warn('Missing PayHere X-Signature header');
      throw new HttpException('Missing signature', HttpStatus.UNAUTHORIZED);
    }

    const isVerified = verifyPayHereHmac(rawBody, signature, merchantSecret);
    log.debug(`HMAC Verification result: ${isVerified}. Signature provided: ${signature}`);

    if (!isVerified) {
      log.warn(`Invalid PayHere HMAC signature. RawBody length: ${rawBody.length}`);
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const parsed = parsePayHerePayload(rawBody);
    const status = mapPayHereStatus(parsed.statusCode);
    const pspPaymentId = parsed.pspPaymentId;
    if (!pspPaymentId) {
      log.warn('PayHere webhook missing payment id', parsed);
      throw new HttpException('Missing payment id', HttpStatus.BAD_REQUEST);
    }

    // Idempotency prevention: check if we already recorded an event with same pspPaymentId + event_type
    const existingEvent = await this.eventRepo.existsWebhookEvent(pspPaymentId);

    if (existingEvent) {
      log.log(
        `Duplicate webhook received for pspPaymentId=${pspPaymentId}, ignoring`,
      );
      return { ok: true, duplicate: true };
    }

    // Find corresponding payment by psp_payment_id or bookingId
    log.debug(`Looking up payment for pspPaymentId: ${pspPaymentId}, orderId: ${parsed.orderId}`);
    const payment = await this.paymentRepo.findByPspOrBooking(
      pspPaymentId,
      parsed.orderId,
    );

    if (payment) {
      log.debug(`Found payment: ${payment.id} with status: ${payment.status}`);
    } else {
      log.warn(`Payment not found for pspPaymentId: ${pspPaymentId}, orderId: ${parsed.orderId}`);
    }

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
    // Update payment status and write audit event atomically
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.paymentRepo.updateStatus(
          payment.id,
          status,
          {
            pspPaymentId,
            pspReference: parsed.raw?.merchant_reference || parsed.raw?.reference,
          },
          tx as any,
        );

        await this.eventRepo.createWebhookEvent(
          payment.id,
          { parsed },
          payment.status,
          status,
          tx as any,
        );
      });
      log.log(`Successfully updated payment ${payment.id} status to ${status}`);
    } catch (err) {
      log.error(`Failed to update payment status transaction for ${payment.id}`, err);
      throw err;
    }

    // TODO: emit message to message broker (RabbitMQ) e.g., payment.succeeded / payment.failed
    log.log(`Processed PayHere webhook for payment ${payment.id} -> ${status}`);

    return { ok: true };
  }
}
