import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Body,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) { }

  @Post('payhere')
  @HttpCode(200)
  @ApiOperation({
    summary: 'PayHere webhook endpoint',
    description:
      'Receives payment notifications from PayHere payment gateway. Requires valid HMAC signature for security.',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing payment ID or invalid webhook payload',
  })
  async payHereWebhook(
    @Body() payload: any,
  ) {
    this.logger.log(`Received PayHere webhook`);
    this.logger.debug(`Webhook Body: ${JSON.stringify(payload)}`);

    try {
      return await this.webhooksService.handlePayHereWebhook(payload);
    } catch (error) {
      this.logger.error(`Error processing PayHere webhook`, error);
      throw error;
    }
  }

  @Post('payhere/test')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Test PayHere webhook (Development only)',
    description:
      'Testing endpoint that bypasses signature verification. Use this for development and testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Test webhook received',
    schema: {
      example: {
        received: true,
        message: 'Test webhook endpoint - signature verification bypassed',
        body: {},
      },
    },
  })
  async payHereWebhookTest(@Body() body: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoint disabled in production');
    }
    return this.webhooksService.handleTestWebhook(body);
  }
}
