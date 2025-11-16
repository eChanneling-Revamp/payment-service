import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhooksController } from './webhooks.controller';
import { PaymentRepository } from '../persistence/repositories/payment.repository';
import { EventRepository } from '../persistence/repositories/event.repository';

@Module({
  imports: [PrismaModule],
  providers: [WebhooksService, PaymentRepository, EventRepository],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
