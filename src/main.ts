import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  const corsOrigin = configService.get<string[] | boolean>(
    'security.corsOrigin',
  );
  
  // Enhanced CORS configuration
  app.enableCors({
    origin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : [
      'http://localhost:3000',
      'http://localhost:5173', 
      'http://localhost:4200',
      'https://payhere-react-demo.vercel.app',
      'https://*.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'idempotency-key',
      'x-payhere-signature',
      'x-signature'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Preserve raw body for webhook signature verification
  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf: Buffer) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Payment Microservice API')
    .setDescription('E-Channeling Payment Service with PayHere Integration')
    .setVersion('1.0')
    .addTag('payments', 'Payment processing operations')
    .addTag('webhooks', 'Webhook handlers for payment notifications')
    .addTag('Health', 'Health check endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀 Payment Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
