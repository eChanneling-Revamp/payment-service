import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { HttpException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('creates payment and returns minimal response', async () => {
      const dto: CreatePaymentDto = {
        bookingId: 'BOOK-1',
        userId: 'user-1',
        amount: 1000,
        paymentMethod: 'card',
      } as any;

      const mockPayment = {
        id: 'pay-1',
        bookingId: dto.bookingId,
        status: 'CREATED',
        amount: dto.amount,
        currency: 'LKR',
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockResolvedValue(mockPayment);

      const res: any = await service.createPayment(dto);

      expect(res).toHaveProperty('id', mockPayment.id);
      expect(res.status).toBe('CREATED');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

  });

  describe('getPaymentById', () => {
    it('returns payment when found', async () => {
      const mockPayment = {
        id: 'pay-10',
        bookingId: 'BOOK-10',
        status: 'CREATED',
        events: [],
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      const res = await service.getPaymentById('pay-10');

      expect(res).toEqual(mockPayment);
      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'pay-10' },
        include: { events: true },
      });
    });

    it('throws 404 when not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentById('nope')).rejects.toThrow(
        HttpException,
      );
    });
  });
});
