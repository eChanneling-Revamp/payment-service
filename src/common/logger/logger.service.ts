import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logLevel: string;
  private logFormat: string;

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get<string>('logging.level') || 'debug';
    this.logFormat = this.configService.get<string>('logging.format') || 'json';
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.writeLog('info', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.writeLog('error', message, context, { trace });
  }

  warn(message: string, context?: string) {
    this.writeLog('warn', message, context);
  }

  debug(message: string, context?: string) {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', message, context);
    }
  }

  verbose(message: string, context?: string) {
    if (this.shouldLog('verbose')) {
      this.writeLog('verbose', message, context);
    }
  }

  private writeLog(
    level: string,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    const timestamp = new Date().toISOString();
    const logContext = context || this.context || 'Application';

    if (this.logFormat === 'json') {
      const logObject = {
        timestamp,
        level,
        context: logContext,
        message,
        ...metadata,
      };
      console.log(JSON.stringify(logObject));
    } else {
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${logContext}] ${message}`;
      console.log(logMessage);
      if (metadata) {
        console.log(JSON.stringify(metadata, null, 2));
      }
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }
}
