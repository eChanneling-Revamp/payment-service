import { Injectable } from '@nestjs/common';
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

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  async check(): Promise<HealthStatus> {
    const health: HealthStatus = {
      status: 'ok',
      timestamp: this.getTimestamp(),
      uptime: this.getUptime(),
      service: 'payment-service',
      version: '1.0.0',
    };

    if (this.configService.get<boolean>('healthCheck.databaseEnabled')) {
      health.database = await this.checkDatabaseConnection();
      if (health.database.status === 'disconnected') health.status = 'error';
    }

    return health;
  }

  async checkDatabase() {
    const database = await this.checkDatabaseConnection();
    return {
      status: database.status === 'connected' ? 'ok' : 'error',
      timestamp: this.getTimestamp(),
      database,
    };
  }

  async checkReadiness() {
    const database = await this.checkDatabaseConnection();
    const isConnected = database.status === 'connected';

    return {
      status: isConnected ? 'ready' : 'not_ready',
      timestamp: this.getTimestamp(),
      checks: { database: isConnected },
    };
  }

  checkLiveness() {
    return {
      status: 'alive',
      timestamp: this.getTimestamp(),
      uptime: this.getUptime(),
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
    } catch {
      return {
        status: 'disconnected' as const,
        responseTime: Date.now() - startTime,
      };
    }
  }
}
