import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Payment } from '@prisma/client';

/**
 * Thin repository wrapping Prisma calls for payments.
 */
@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PaymentCreateInput, tx?: Prisma.TransactionClient): Promise<Payment> {
    const db = (tx as Prisma.TransactionClient) || this.prisma;
    return db.payment.create({ data });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async findByPspOrBooking(pspPaymentId?: string, bookingId?: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        OR: [
          pspPaymentId ? { pspPaymentId } : undefined,
          bookingId ? { bookingId } : undefined,
        ].filter(Boolean) as any[],
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    extraData?: Partial<Prisma.PaymentUpdateInput>,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const db = (tx as Prisma.TransactionClient) || this.prisma;
    return db.payment.update({
      where: { id },
      data: { status, ...extraData, updatedAt: new Date() },
    });
  }
}
