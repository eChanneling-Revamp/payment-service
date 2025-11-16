import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Body,
  ForbiddenException,
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
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payhere')
  @HttpCode(200)
  @ApiOperation({
    summary: 'PayHere webhook endpoint',
    description:
      'Receives payment notifications from PayHere payment gateway. Requires valid HMAC signature for security.',
  })
  @ApiHeader({
    name: 'x-payhere-signature',
    required: true,
    description: 'HMAC-SHA256 signature for webhook verification',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      example: {
        ok: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature - webhook authentication failed',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing payment ID or invalid webhook payload',
  })
  async payHereWebhook(
    @Req() req: Request,
    @Headers() headers: Record<string, any>,
  ) {
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    return this.webhooksService.handlePayHereWebhook(rawBody, headers);
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
    return {
      received: true,
      message: 'Test webhook - signature bypassed',
      body,
      timestamp: new Date().toISOString(),
    };
  }
}
