import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database?: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  service: string;
  version: string;
}

@Injectable()
export class HealthCheckService {
  private startTime: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  async check(): Promise<HealthStatus> {
    const dbHealthEnabled = this.configService.get<boolean>(
      'healthCheck.databaseEnabled',
    );

    const health: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      service: 'payment-service',
      version: '1.0.0',
    };

    if (dbHealthEnabled) {
      const dbHealth = await this.checkDatabaseConnection();
      health.database = dbHealth;

      if (dbHealth.status === 'disconnected') {
        health.status = 'error';
      }
    }

    return health;
  }

  async checkDatabase() {
    const dbHealth = await this.checkDatabaseConnection();
    
    return {
      status: dbHealth.status === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }

  async checkReadiness() {
    const dbHealth = await this.checkDatabaseConnection();
    
    const isReady = dbHealth.status === 'connected';
    
    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth.status === 'connected',
      },
    };
  }

  async checkLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private async checkDatabaseConnection() {
    const startTime = Date.now();
    
    try {
      // Execute a simple query to check connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected' as const,
        responseTime,
      };
    } catch (error) {
      return {
        status: 'disconnected' as const,
        responseTime: Date.now() - startTime,
      };
    }
  }
}
