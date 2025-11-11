import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Seed example: Create a test payment record
  const testPayment = await prisma.payment.upsert({
    where: { bookingId: 'TEST-BOOKING-001' },
    update: {},
    create: {
      bookingId: 'TEST-BOOKING-001',
      userId: 'test-user-001',
      amount: 1500.00,
      currency: 'LKR',
      psp: 'payhere',
      paymentMethod: 'card',
      status: 'CREATED',
      metadata: {
        description: 'Test payment for development',
        environment: 'development',
      },
    },
  });

  console.log('Created test payment:', testPayment);

  // Seed example: Create a payment event
  const testEvent = await prisma.paymentEvent.create({
    data: {
      paymentId: testPayment.id,
      eventType: 'payment.created',
      eventSource: 'seed',
      payload: {
        bookingId: testPayment.bookingId,
        amount: testPayment.amount,
      },
      statusBefore: null,
      statusAfter: 'CREATED',
    },
  });

  console.log('Created test event:', testEvent);

  // Seed example: Create an idempotency key
  const testIdempotencyKey = await prisma.idempotencyKey.upsert({
    where: { key: 'test-idempotency-key-001' },
    update: {},
    create: {
      key: 'test-idempotency-key-001',
      requestHash: 'test-hash-001',
      responseStatus: 201,
      responseBody: {
        id: testPayment.id,
        status: 'CREATED',
      },
    },
  });

  console.log('Created test idempotency key:', testIdempotencyKey);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
