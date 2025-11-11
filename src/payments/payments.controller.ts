import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: {
        id: 'uuid',
        bookingId: 'BOOKING-001',
        status: 'CREATED',
        amount: 1500.0,
        currency: 'LKR',
        createdAt: '2025-11-11T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Idempotency key conflict' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key to prevent duplicate payments',
  })
  async createPayment(
    @Body() body: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createPayment(body, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    schema: {
      example: {
        id: 'uuid',
        bookingId: 'BOOKING-001',
        userId: 'user-123',
        amount: 1500.0,
        currency: 'LKR',
        status: 'CREATED',
        psp: 'payhere',
        paymentMethod: 'card',
        createdAt: '2025-11-11T10:00:00.000Z',
        updatedAt: '2025-11-11T10:00:00.000Z',
        events: [],
        refunds: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }
}
