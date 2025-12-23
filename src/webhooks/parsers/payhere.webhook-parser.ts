import { Logger } from '@nestjs/common';

const logger = new Logger('PayHereParser');

export function parsePayHerePayload(rawBody: string) {
  logger.debug(`Parsing raw body: ${rawBody}`);
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    logger.warn(`Failed to parse webhook body as JSON: ${e.message}. Using raw body.`);
    body = rawBody as any;
  }

  const result = {
    merchantId: body?.merchant_id || body?.merchantId || body?.merchant,
    orderId: body?.order_id || body?.orderId || body?.order,
    pspPaymentId: body?.payment_id || body?.paymentId,
    statusCode: body?.status_code || body?.status || body?.statusCode,
    raw: body,
  };

  logger.debug(`Parsed payload: ${JSON.stringify(result)}`);
  return result;
}
