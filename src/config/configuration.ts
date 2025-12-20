export default () => ({
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BACKEND_BASE_URL || '',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      connectionTimeout: parseInt(
        process.env.DB_CONNECTION_TIMEOUT || '20000',
        10,
      ),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    },
  },

  payhere: {
    merchantId: process.env.PAYHERE_MERCHANT_ID,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
    mode: process.env.PAYHERE_MODE || 'sandbox',
    apiUrl:
      process.env.PAYHERE_API_URL || 'https://sandbox.payhere.lk/pay/checkout',
  },

  security: {
    corsOrigin: (() => {
      // Allow localhost:5173 for development
      return [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4002',
      ];
    })(),
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
  },

  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    databaseEnabled: process.env.HEALTH_CHECK_DATABASE_ENABLED === 'true',
  },

  webhook: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000', 10),
  },
});
