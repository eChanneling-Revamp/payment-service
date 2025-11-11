import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private hashRequest(body: any) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex');
  }

  async createPayment(dto: CreatePaymentDto, idempotencyKey?: string) {
    const requestHash = this.hashRequest({ dto });

    if (idempotencyKey) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing?.responseBody) return existing.responseBody;
      if (existing)
        throw new HttpException(
          'Idempotency key exists but no cached response',
          HttpStatus.CONFLICT,
        );
    }

    // Create payment + event + idempotency record in a transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            bookingId: dto.bookingId,
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency || 'LKR',
            psp: dto.psp || 'payhere',
            paymentMethod: dto.paymentMethod,
            metadata: dto.metadata || {},
            status: 'CREATED',
            expiresAt: dto.expiresAt && new Date(dto.expiresAt),
            idempotencyKey,
          },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: 'payment.created',
            eventSource: 'service',
            payload: { bookingId: dto.bookingId, amount: dto.amount },
            statusBefore: null,
            statusAfter: 'CREATED',
          },
        });

        if (idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              key: idempotencyKey,
              requestHash,
              responseStatus: 201,
              responseBody: {
                id: payment.id,
                bookingId: payment.bookingId,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
              },
              expiresAt: dto.expiresAt && new Date(dto.expiresAt),
            },
          });
        }

        return payment;
      });

      const { id, bookingId, status, amount, currency, createdAt } = result;
      return { id, bookingId, status, amount, currency, createdAt };
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { events: true, refunds: true },
    });

    if (!payment) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }

    return payment;
  }

  private handlePrismaError(error: any): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target || error.meta?.field_name || 'unknown';
      const targetStr = Array.isArray(target)
        ? target.join(', ')
        : String(target);
      throw new HttpException(
        `Unique constraint failed: ${targetStr}`,
        HttpStatus.CONFLICT,
      );
    }
    throw new HttpException(
      'Database error during payment creation',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
