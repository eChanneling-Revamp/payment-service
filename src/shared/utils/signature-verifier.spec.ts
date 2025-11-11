import { verifyPayHereSignature } from './signature-verifier';
import * as crypto from 'crypto';

describe('verifyPayHereSignature', () => {
  const merchantId = 'test_merchant';
  const merchantSecret = 'test_secret';
  const rawBody = '{"order_id":"123","amount":1000}';

  it('should verify valid signature', () => {
    const hmac = crypto.createHmac('sha256', merchantSecret);
    hmac.update(merchantId + rawBody);
    const validSignature = hmac.digest('hex');

    const result = verifyPayHereSignature(
      rawBody,
      validSignature,
      merchantId,
      merchantSecret,
    );

    expect(result).toBe(true);
  });

  it('should reject invalid signature', () => {
    const invalidSignature = 'invalid_signature_hash';

    const result = verifyPayHereSignature(
      rawBody,
      invalidSignature,
      merchantId,
      merchantSecret,
    );

    expect(result).toBe(false);
  });

  it('should handle signature with HMAC prefix', () => {
    const hmac = crypto.createHmac('sha256', merchantSecret);
    hmac.update(merchantId + rawBody);
    const signature = hmac.digest('hex');
    const signatureWithPrefix = `HMAC ${signature}`;

    const result = verifyPayHereSignature(
      rawBody,
      signatureWithPrefix,
      merchantId,
      merchantSecret,
    );

    expect(result).toBe(true);
  });

  it('should return false when signature is undefined', () => {
    const result = verifyPayHereSignature(
      rawBody,
      undefined,
      merchantId,
      merchantSecret,
    );

    expect(result).toBe(false);
  });

  it('should return false if lengths differ', () => {
    const hmac = crypto.createHmac('sha256', merchantSecret);
    hmac.update(merchantId + rawBody);
    const signature = hmac.digest('hex') + '00';

    const result = verifyPayHereSignature(
      rawBody,
      signature,
      merchantId,
      merchantSecret,
    );

    expect(result).toBe(false);
  });
});
