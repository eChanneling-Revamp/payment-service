import { parsePayHerePayload } from './payhere.webhook-parser';

describe('parsePayHerePayload', () => {
  it('parses raw JSON string with snake_case fields', () => {
    const raw = JSON.stringify({
      merchant_id: 'm-123',
      order_id: 'order-1',
      payment_id: 'psp-1',
      status_code: 2,
      extra: 'x',
    });

    const parsed = parsePayHerePayload(raw);
    expect(parsed.merchantId).toBe('m-123');
    expect(parsed.orderId).toBe('order-1');
    expect(parsed.pspPaymentId).toBe('psp-1');
    expect(parsed.statusCode).toBe(2);
    expect(parsed.raw).toBeDefined();
  });

  it('parses already-parsed object with camelCase fields', () => {
    const obj = {
      merchantId: 'm-456',
      orderId: 'order-2',
      paymentId: 'psp-2',
      status: -1,
    };

    const parsed = parsePayHerePayload(obj as any);
    expect(parsed.merchantId).toBe('m-456');
    expect(parsed.orderId).toBe('order-2');
    expect(parsed.pspPaymentId).toBe('psp-2');
    expect(parsed.statusCode).toBe(-1);
  });

  it('falls back when JSON.parse fails and returns raw as-is', () => {
    // Provide an invalid JSON (not parseable) but not an object
    const bad = 'not-a-json';
    const parsed = parsePayHerePayload(bad as any);
    // If parse fails, parser will attempt to treat rawBody as already parsed; expect fields undefined
    expect(parsed.merchantId || null).toBeNull();
    expect(parsed.orderId || null).toBeNull();
    expect(parsed.pspPaymentId || null).toBeNull();
    expect(parsed.raw).toBe(bad);
  });
});
