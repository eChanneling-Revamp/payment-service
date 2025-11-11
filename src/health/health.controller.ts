import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    return this.healthCheckService.check();
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database connectivity' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async checkDatabase() {
    return this.healthCheckService.checkDatabase();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if service is ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async checkReadiness() {
    return this.healthCheckService.checkReadiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if service is alive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async checkLiveness() {
    return this.healthCheckService.checkLiveness();
  }
}
