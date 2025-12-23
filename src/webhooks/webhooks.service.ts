import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRepository } from '../persistence/repositories/payment.repository';
import { EventRepository } from '../persistence/repositories/event.repository';
import {
  verifyPayHereNotification,
  parsePayHerePayload,
  mapPayHereStatus,
  verifyPayHereHmac,
  PayHereParsed,
} from '../psp-adapters/payhere.adapter';

const log = new Logger('WebhooksService');

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepo: PaymentRepository,
    private readonly eventRepo: EventRepository,
  ) { }

  async handlePayHereWebhook(payload: any) {
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? '';

    // Verify using MD5 signature present in payload
    // PayHere sends 'md5sig' in the body
    const isVerified = verifyPayHereNotification(payload, merchantSecret);

    if (!isVerified) {
      log.warn(`Invalid PayHere MD5 signature. Payload: ${JSON.stringify(payload)}`);
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Parse/Normalize payload
    const parsed = parsePayHerePayload(payload);
    return this.processPaymentStatus(parsed);
  }

  async handleTestWebhook(payload: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Test endpoint disabled in production', HttpStatus.FORBIDDEN);
    }
    const parsed = parsePayHerePayload(payload);
    return this.processPaymentStatus(parsed);
  }

  private async processPaymentStatus(parsed: PayHereParsed) {
    const status = mapPayHereStatus(parsed.statusCode || '');
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
