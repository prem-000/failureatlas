/**
 * src/lib/logger.ts
 * Centralized logging utility
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel = (process.env.LOG_LEVEL || 'INFO') as keyof typeof LogLevel;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry;
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  debug(message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.DEBUG,
      message,
      data
    };

    if (this.isDevelopment) {
      console.debug(this.formatLog(entry));
    }
  }

  info(message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.INFO,
      message,
      data
    };

    console.log(this.formatLog(entry));
  }

  warn(message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.WARN,
      message,
      data
    };

    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: Error | Record<string, any> | unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    let entry: LogEntry;

    if (error instanceof Error) {
      entry = {
        timestamp: this.formatTimestamp(),
        level: LogLevel.ERROR,
        message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        } as any
      };
    } else if (typeof error === 'object' && error !== null) {
      entry = {
        timestamp: this.formatTimestamp(),
        level: LogLevel.ERROR,
        message,
        data: error as Record<string, any>
      };
    } else {
      entry = {
        timestamp: this.formatTimestamp(),
        level: LogLevel.ERROR,
        message,
        data: { error: String(error) }
      };
    }

    console.error(this.formatLog(entry));
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`⏱️ ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * Create a child logger with prefix
   */
  child(namespace: string): Logger {
    const childLogger = new Logger();
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.info = (message: string, data?: Record<string, any>) => {
      originalInfo(`[${namespace}] ${message}`, data);
    };

    childLogger.warn = (message: string, data?: Record<string, any>) => {
      originalWarn(`[${namespace}] ${message}`, data);
    };

    childLogger.error = (message: string, error?: Error | Record<string, any> | unknown) => {
      originalError(`[${namespace}] ${message}`, error);
    };

    return childLogger;
  }
}

export const logger = new Logger();

/**
 * Higher-order function to log async operations
 */
export function logAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      logger.performance(operationName, duration, { status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`${operationName} failed after ${duration}ms`, error);
      throw error;
    }
  };
}