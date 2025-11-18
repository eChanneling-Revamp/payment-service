import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentEvent } from '@prisma/client';

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsWebhookEvent(pspPaymentId: string): Promise<boolean> {
    const ev = await this.prisma.paymentEvent.findFirst({
      where: {
        payload: { path: ['pspPaymentId'], equals: pspPaymentId },
        eventType: 'webhook.received',
      },
      select: { id: true },
    });
    return !!ev;
  }

  async createWebhookEvent(
    paymentId: string,
    payload: any,
    statusBefore: string | null,
    statusAfter: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentEvent> {
    const db = (tx as Prisma.TransactionClient) || this.prisma;
    return db.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'webhook.received',
        eventSource: 'payhere',
        payload,
        statusBefore,
        statusAfter,
      },
    });
  }

  async recordEvent(
    data: Prisma.PaymentEventCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = (tx as Prisma.TransactionClient) || this.prisma;
    return db.paymentEvent.create({ data });
  }
}
