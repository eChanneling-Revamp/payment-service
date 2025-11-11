import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsObject,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Booking identifier associated with this payment',
    example: 'BOOKING-12345',
  })
  @IsString()
  bookingId!: string;

  @ApiProperty({
    description: 'User identifier who initiated the payment',
    example: 'user-abc-123',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Amount in decimal (e.g., 1000.00)',
    example: 1500.0,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({
    description: 'Currency code (default: LKR)',
    example: 'LKR',
    default: 'LKR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'card',
    enum: ['card', 'wallet', 'qr', 'add-to-bill'],
  })
  @IsString()
  @IsIn(['card', 'wallet', 'qr', 'add-to-bill'])
  paymentMethod!: string;

  @ApiPropertyOptional({
    description:
      'PSP identifier (e.g., payhere). Defaults to payhere if omitted.',
    example: 'payhere',
    default: 'payhere',
  })
  @IsOptional()
  @IsString()
  psp?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for frontend/reference',
    example: {
      doctorName: 'Dr. Smith',
      appointmentDate: '2025-11-15',
      sessionNumber: 12,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional expiry timestamp (ISO string)',
    example: '2025-11-11T18:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
