import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRepository } from '../persistence/repositories/payment.repository';
import { EventRepository } from '../persistence/repositories/event.repository';
import { HttpException } from '@nestjs/common';
import * as payHereAdapter from '../psp-adapters/payhere.adapter';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: PrismaService;

  const mockPrisma = {
    webhookAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockPaymentRepo = {
    findByPspOrBooking: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockEventRepo = {
    existsWebhookEvent: jest.fn(),
    createWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    process.env.PAYHERE_MERCHANT_SECRET = 'test_merchant_secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentRepository, useValue: mockPaymentRepo },
        { provide: EventRepository, useValue: mockEventRepo },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });
    it('should have PAYHERE_MERCHANT_SECRET set in the environment', () => {
      expect(process.env.PAYHERE_MERCHANT_SECRET).toBe('test_merchant_secret');
    });

  it('rejects invalid signature', async () => {
      await expect(
        service.handlePayHereWebhook(
          'merchant_id=123&order_id=ord1&invalid=data',
          { headers: { 'x-signature': 'INVALID', 'X-Signature': 'INVALID' } },
        ),
      ).rejects.toThrow(HttpException);
    });

  it('handles duplicate webhook', async () => {
    jest
      .spyOn(payHereAdapter, 'verifyPayHereHmac')
      .mockImplementation((rawBody, signature, secret) => signature === 'VALID' && secret === 'test_merchant_secret');
    mockEventRepo.existsWebhookEvent.mockResolvedValue(true);

    const rawBody =
      'merchant_id=123&order_id=ord1&payment_id=psp-1&payhere_amount=100.00&payhere_currency=LKR&status_code=2&md5sig=VALID';
    const res = await service.handlePayHereWebhook(rawBody, { 'x-signature': 'VALID', 'X-Signature': 'VALID' });
    expect(res).toEqual({ ok: true, duplicate: true });
    expect(payHereAdapter.verifyPayHereHmac).toHaveBeenCalledWith(rawBody, 'VALID', 'test_merchant_secret');
  });

  it('creates audit log for unknown payment', async () => {
    jest
      .spyOn(payHereAdapter, 'verifyPayHereHmac')
      .mockImplementation((rawBody, signature, secret) => signature === 'VALID' && secret === 'test_merchant_secret');
    mockEventRepo.existsWebhookEvent.mockResolvedValue(false);
    mockPaymentRepo.findByPspOrBooking.mockResolvedValue(null);
    mockPrisma.webhookAuditLog.create.mockResolvedValue({ id: 'log-1' });

    const rawBody =
      'merchant_id=123&order_id=ord2&payment_id=psp-2&payhere_amount=100.00&payhere_currency=LKR&status_code=2&md5sig=VALID';
    const res = await service.handlePayHereWebhook(rawBody, { 'x-signature': 'VALID', 'X-Signature': 'VALID' });
    expect(mockPrisma.webhookAuditLog.create).toHaveBeenCalled();
    expect(res).toHaveProperty('note', 'unknown_payment');
    expect(payHereAdapter.verifyPayHereHmac).toHaveBeenCalledWith(rawBody, 'VALID', 'test_merchant_secret');
  });

  it('processes webhook and updates payment', async () => {
    jest
      .spyOn(payHereAdapter, 'verifyPayHereHmac')
      .mockImplementation((rawBody, signature, secret) => signature === 'VALID' && secret === 'test_merchant_secret');
    mockEventRepo.existsWebhookEvent.mockResolvedValue(false);
    const paymentObj = { id: 'pay-3', status: 'CREATED' };
    mockPaymentRepo.findByPspOrBooking.mockResolvedValue(paymentObj);

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {};
      await fn(tx);
      return true;
    });

    const rawBody =
      'merchant_id=123&order_id=ord3&payment_id=psp-3&payhere_amount=100.00&payhere_currency=LKR&status_code=2&md5sig=VALID';
    const res = await service.handlePayHereWebhook(rawBody, { 'x-signature': 'VALID', 'X-Signature': 'VALID' });
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(payHereAdapter.verifyPayHereHmac).toHaveBeenCalledWith(rawBody, 'VALID', 'test_merchant_secret');
  });
});
