import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import * as verifier from '../shared/utils/signature-verifier';
import * as parser from './parsers/payhere.webhook-parser';
import { HttpException } from '@nestjs/common';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: PrismaService;

  const mockPrisma = {
    paymentEvent: { findFirst: jest.fn(), create: jest.fn() },
    payment: { findFirst: jest.fn(), update: jest.fn() },
    webhookAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('rejects invalid signature', async () => {
    jest.spyOn(verifier, 'verifyPayHereSignature').mockReturnValue(false);
    await expect(service.handlePayHereWebhook('{}', {})).rejects.toThrow(
      HttpException,
    );
  });

  it('handles duplicate webhook', async () => {
    jest.spyOn(verifier, 'verifyPayHereSignature').mockReturnValue(true);
    jest.spyOn(parser, 'parsePayHerePayload').mockReturnValue({
      pspPaymentId: 'psp-1',
      statusCode: 2,
      orderId: 'order-1',
      raw: {},
    });
    mockPrisma.paymentEvent.findFirst.mockResolvedValue({
      id: 'event-1',
    });

    const res = await service.handlePayHereWebhook('{}', {
      'x-payhere-signature': 'sig',
    });
    expect(res).toEqual({ ok: true, duplicate: true });
  });

  it('creates audit log for unknown payment', async () => {
    jest.spyOn(verifier, 'verifyPayHereSignature').mockReturnValue(true);
    jest.spyOn(parser, 'parsePayHerePayload').mockReturnValue({
      pspPaymentId: 'psp-2',
      statusCode: 2,
      orderId: 'order-2',
      raw: {},
    });
    mockPrisma.paymentEvent.findFirst.mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.webhookAuditLog.create.mockResolvedValue({
      id: 'log-1',
    });

    const res = await service.handlePayHereWebhook('{}', {
      'x-payhere-signature': 'sig',
    });
    expect(mockPrisma.webhookAuditLog.create).toHaveBeenCalled();
    expect(res).toHaveProperty('note', 'unknown_payment');
  });

  it('processes webhook and updates payment', async () => {
    jest.spyOn(verifier, 'verifyPayHereSignature').mockReturnValue(true);
    jest.spyOn(parser, 'parsePayHerePayload').mockReturnValue({
      pspPaymentId: 'psp-3',
      statusCode: 2,
      orderId: 'order-3',
      raw: { reference: 'ref-1', merchant_reference: 'mref' },
    });
    mockPrisma.paymentEvent.findFirst.mockResolvedValue(null);
    const paymentObj = { id: 'pay-3', status: 'CREATED' };
    mockPrisma.payment.findFirst.mockResolvedValue(paymentObj);

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        payment: { update: jest.fn().mockResolvedValue(true) },
        paymentEvent: { create: jest.fn().mockResolvedValue(true) },
      };
      await fn(tx);
      return true;
    });

    const res = await service.handlePayHereWebhook('{}', {
      'x-payhere-signature': 'sig',
    });
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
