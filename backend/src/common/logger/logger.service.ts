import {
  Injectable,
  Logger,
  LoggerService as NestLoggerService,
  LogLevel,
} from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private context: string;

  constructor(context = 'Application') {
    this.logger = new Logger(context);
    this.context = context;
  }

  setContext(context: string): void {
    this.context = context;
    (this.logger as any).context = context;
  }

  log(message: any, context?: string): void {
    this.logger.log(message, context || this.context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, trace, context || this.context);
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, context || this.context);
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, context || this.context);
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, context || this.context);
  }

  fatal(message: any, context?: string): void {
    this.logger.fatal(message, context || this.context);
  }

  setLogLevels(levels: LogLevel[]): void {
    this.logger.localInstance.setLogLevels(levels);
  }
}
