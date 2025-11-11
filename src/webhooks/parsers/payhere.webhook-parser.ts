export function parsePayHerePayload(rawBody: string) {
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = rawBody as any;
  }

  return {
    merchantId: body?.merchant_id || body?.merchantId || body?.merchant,
    orderId: body?.order_id || body?.orderId || body?.order,
    pspPaymentId: body?.payment_id || body?.paymentId,
    statusCode: body?.status_code || body?.status || body?.statusCode,
    raw: body,
  };
}
