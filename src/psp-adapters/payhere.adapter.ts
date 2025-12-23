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
      : payloadOrRaw;

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
export function parsePayHerePayload(rawBody: string | Record<string, any>): PayHereParsed {
  const parsed = typeof rawBody === 'string' ? parseFormUrlEncoded(rawBody) : rawBody;
  const result: PayHereParsed = {
    raw: parsed,
    payment_id: parsed['payment_id'],
    orderId: parsed['order_id'] || parsed['orderId'] || parsed['order_id'],
    pspPaymentId: parsed['payment_id'],
    payhere_amount: parsed['payhere_amount'],
    payhere_currency: parsed['payhere_currency'],
    statusCode: parsed['status_code']
      ? Number(parsed['status_code'])
      : undefined,
    md5sig: parsed['md5sig'],
  };
  return result;
}

/**
 * Verify the incoming notification using HMAC-SHA1 signature.
 * Expected by the new PayHere webhook implementation.
 * API: signature = HMAC_SHA1(secret, rawBody)
 */
export function verifyPayHereHmac(
  rawBody: string,
  signature: string,
  merchantSecret: string,
): boolean {
  if (!signature || !merchantSecret) return false;

  const computed = crypto
    .createHmac('sha1', merchantSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

/**
 * Generate hash for payment initiation.
 * Formula: toupper(md5(merchant_id + order_id + amount + currency + toupper(md5(merchant_secret))))
 * Note: amount should be formatted to 2 decimal places.
 */
export function generatePayHereInitiationHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string,
): string {
  console.log('--- PayHere Hash Debug ---');
  console.log('Merchant ID:', merchantId);
  console.log('Order ID:', orderId);
  console.log('Amount:', amount);
  console.log('Currency:', currency);

  const secretHash = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  console.log('Secret Hash (uppercased MD5):', secretHash);

  const str = merchantId + orderId + amount + currency + secretHash;

  console.log('Pre-Hash String:', str);

  const finalHash = crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
    .toUpperCase();
  console.log('Final Hash:', finalHash);
  console.log('--------------------------');

  return finalHash;
}
