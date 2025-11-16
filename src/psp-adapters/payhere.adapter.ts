import * as crypto from 'crypto';

export type PayHereParsed = Record<string, any> & {
  payment_id?: string;
  order_id?: string;
  payhere_amount?: string;
  payhere_currency?: string;
  status_code?: string | number;
  md5sig?: string;
  raw?: Record<string, any>;
};

/**
 * Map PayHere status codes to domain status.
 * 2 -> SUCCEEDED
 * 0 -> PENDING
 * -1 -> CANCELLED
 * -2 -> FAILED
 * -3 -> DISPUTED
 */
export function mapPayHereStatus(code: number | string): string {
  const STATUS_MAP: Record<string, string> = {
    '2': 'SUCCEEDED',
    '0': 'PENDING',
    '-1': 'CANCELLED',
    '-2': 'FAILED',
    '-3': 'DISPUTED',
  };
  return STATUS_MAP[String(code)] || 'PENDING';
}

/**
 * Compute PayHere md5 signature using formula from docs.
 * md5sig = strtoupper(
 *   md5(
 *     merchant_id +
 *     order_id +
 *     payhere_amount +
 *     payhere_currency +
 *     status_code +
 *     strtoupper(md5(merchant_secret))
 *   )
 * )
 */
export function computePayHereMd5(params: {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string | number;
  merchant_secret: string;
}): string {
  const secretHash = crypto
    .createHash('md5')
    .update(params.merchant_secret)
    .digest('hex')
    .toUpperCase();

  const raw =
    params.merchant_id +
    params.order_id +
    params.payhere_amount +
    params.payhere_currency +
    String(params.status_code) +
    secretHash;

  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

/**
 * Parse application/x-www-form-urlencoded body into an object.
 */
export function parseFormUrlEncoded(rawBody: string): Record<string, string> {
  const params = new URLSearchParams(rawBody);
  const res: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    res[k] = v;
  }
  return res;
}

/**
 * Verify the incoming notification using merchant_secret.
 * Accepts rawBody (form encoded) or already-parsed object.
 */
export function verifyPayHereNotification(
  payloadOrRaw: string | Record<string, any>,
  merchantSecret: string,
  merchantId?: string,
): boolean {
  const parsed =
    typeof payloadOrRaw === 'string'
      ? parseFormUrlEncoded(payloadOrRaw)
      : (payloadOrRaw as Record<string, any>);

  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = parsed as Record<string, string>;

  if (!md5sig) return false;

  // merchant_id may be verified if provided
  if (merchantId && merchant_id && merchantId !== merchant_id) return false;

  const computed = computePayHereMd5({
    merchant_id: merchant_id ?? '',
    order_id: order_id ?? '',
    payhere_amount: payhere_amount ?? '',
    payhere_currency: payhere_currency ?? '',
    status_code: status_code ?? '',
    merchant_secret: merchantSecret,
  });

  return computed === String(md5sig).toUpperCase();
}

/**
 * Parse raw payhere payload into a standardized object used by the app.
 */
export function parsePayHerePayload(rawBody: string): PayHereParsed {
  const parsed = parseFormUrlEncoded(rawBody);
  const result: PayHereParsed = {
    raw: parsed,
    payment_id: parsed['payment_id'],
    orderId: parsed['order_id'] || parsed['orderId'] || parsed['order_id'],
    pspPaymentId: parsed['payment_id'],
    payhere_amount: parsed['payhere_amount'],
    payhere_currency: parsed['payhere_currency'],
    statusCode: parsed['status_code'] ? Number(parsed['status_code']) : undefined,
    md5sig: parsed['md5sig'],
  };
  return result;
}
