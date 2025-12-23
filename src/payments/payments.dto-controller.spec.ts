import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('CreatePaymentDto validation', () => {
  it('validates a correct DTO', async () => {
    const payload = {
      bookingId: 'B1',
      userId: 'U1',
      amount: 1500,
      paymentMethod: 'card',
    };
    const dto = plainToInstance(CreatePaymentDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects missing required fields', async () => {
    const payload = { amount: 1500 };
    const dto = plainToInstance(CreatePaymentDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toEqual(
      expect.arrayContaining(['bookingId', 'userId', 'paymentMethod']),
    );
  });

  it('rejects invalid paymentMethod', async () => {
    const payload = {
      bookingId: 'B2',
      userId: 'U2',
      amount: 100,
      paymentMethod: 'invalid',
    };
    const dto = plainToInstance(CreatePaymentDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const methodError = errors.find((e) => e.property === 'paymentMethod');
    expect(methodError).toBeDefined();
  });

  it('transforms amount to number if possible', async () => {
    const payload = {
      bookingId: 'B3',
      userId: 'U3',
      amount: '2000',
      paymentMethod: 'card',
    };
    const dto = plainToInstance(CreatePaymentDto, payload);
    expect(typeof (dto as any).amount).toBe('number');
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const mockService = {
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('should create payment and return result', async () => {
    const dto: CreatePaymentDto = {
      bookingId: 'B1',
      userId: 'U1',
      amount: 1000,
      paymentMethod: 'card',
    } as any;
    const expected = {
      id: 'p1',
      bookingId: 'B1',
      status: 'CREATED',
      amount: 1000,
      currency: 'LKR',
      createdAt: new Date(),
    };
    mockService.createPayment.mockResolvedValue(expected);

    const res = await controller.createPayment(dto);
    expect(res).toEqual(expected);
    expect(mockService.createPayment).toHaveBeenCalledWith(dto);
  });


  it('should get payment by id', async () => {
    mockService.getPaymentById.mockResolvedValue({ id: 'p3' });
    const res = await controller.getPayment('p3');
    expect(res).toEqual({ id: 'p3' });
    expect(mockService.getPaymentById).toHaveBeenCalledWith('p3');
  });
});
