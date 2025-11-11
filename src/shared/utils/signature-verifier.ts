import * as crypto from 'crypto';

/**
 * Verify PayHere HMAC-SHA256 signature against raw request body.
 * Returns true if signature matches, false otherwise.
 */
export function verifyPayHereSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  merchantId: string,
  merchantSecret: string,
): boolean {
  if (!signatureHeader) return false;

  try {
    const expected = crypto
      .createHmac('sha256', merchantSecret)
      .update(merchantId + rawBody)
      .digest('hex');

    const provided = signatureHeader.includes(' ')
      ? signatureHeader.split(' ').pop()!
      : signatureHeader;

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
