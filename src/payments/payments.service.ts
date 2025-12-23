import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma } from '@prisma/client';
import { generatePayHereInitiationHash } from '../psp-adapters/payhere.adapter';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) { }


  async createPayment(dto: CreatePaymentDto) {
    // Create payment + event in a transaction
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

        return payment;
      });

      const { id, bookingId, status, amount, currency, createdAt } = result;

      // Generate PayHere form data
      // For demo purposes, we get env vars directly. Ideally inject ConfigService.
      const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
      const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
      const backendBaseUrl = process.env.BACKEND_BASE_URL || ''; // Backend base URL
      const frontendBaseUrl = process.env.FRONTEND_BASE_URL || ''; // Frontend base URL

      // Amount must be formatted to 2 decimal places
      const amountStr = Number(amount).toFixed(2);

      const hash = generatePayHereInitiationHash(
        merchantId,
        bookingId, // order_id
        amountStr,
        currency,
        merchantSecret,
      );

      const payhereForm = {
        merchant_id: merchantId,
        return_url: `${frontendBaseUrl}/success`, // Frontend success URL
        cancel_url: `${frontendBaseUrl}/cancel`, // Frontend cancel URL
        notify_url: `${backendBaseUrl}/api/v1/webhooks/payhere`, // Backend notify URL
        order_id: bookingId,
        items: `Booking ${bookingId}`,
        currency: currency,
        amount: amountStr,
        first_name: 'John', // Mock data
        last_name: 'Doe', // Mock data
        email: 'john@example.com',
        phone: '0771234567',
        address: 'No.1, Galle Road',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash: hash,
        sandbox: '1', // Enable sandbox mode
      };

      return {
        id,
        bookingId,
        status,
        amount,
        currency,
        createdAt,
        payhereForm,
      };
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { events: true },
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
