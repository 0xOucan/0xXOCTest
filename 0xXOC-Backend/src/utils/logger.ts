/**
 * Centralized logging utility
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Get the minimum log level from environment or use DEBUG for development
const MIN_LOG_LEVEL = process.env.LOG_LEVEL || LogLevel.DEBUG;

// Log level priority map (lower number = higher priority)
const LOG_LEVEL_PRIORITY = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
};

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  data?: any;
}

// Storing recent logs in memory (limited to 1000 entries)
const MAX_LOG_ENTRIES = 1000;
const recentLogs: LogEntry[] = [];

/**
 * Check if a log level should be displayed based on minimum level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL as LogLevel];
}

/**
 * Add a log entry to memory and console
 */
function addLogEntry(level: LogLevel, message: string, module: string, data?: any): void {
  // Skip if below minimum log level
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const entry: LogEntry = {
    timestamp,
    level,
    message,
    module,
    data
  };

  // Add to in-memory logs
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOG_ENTRIES) {
    recentLogs.shift();
  }

  // Output to console with appropriate method
  const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(`[${timestamp}] [${module}] ${message}${logData}`);
      break;
    case LogLevel.INFO:
      console.info(`[${timestamp}] [${module}] ${message}${logData}`);
      break;
    case LogLevel.WARN:
      console.warn(`[${timestamp}] [${module}] ${message}${logData}`);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(`[${timestamp}] [${module}] ${message}${logData}`);
      break;
  }
}

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  fatal: (message: string, data?: any) => void;
}

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string): Logger {
  return {
    debug: (message: string, data?: any) => addLogEntry(LogLevel.DEBUG, message, module, data),
    info: (message: string, data?: any) => addLogEntry(LogLevel.INFO, message, module, data),
    warn: (message: string, data?: any) => addLogEntry(LogLevel.WARN, message, module, data),
    error: (message: string, data?: any) => addLogEntry(LogLevel.ERROR, message, module, data),
    fatal: (message: string, data?: any) => addLogEntry(LogLevel.FATAL, message, module, data)
  };
}

/**
 * Get recent logs (for debugging and reporting)
 */
export function getRecentLogs(level?: LogLevel): LogEntry[] {
  if (level) {
    return recentLogs.filter(entry => entry.level === level);
  }
  return [...recentLogs];
}

/**
 * Format error for logging
 */
export function formatError(error: any): any {
  // Extract useful properties from error objects
  if (error instanceof Error) {
    const formatted = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    
    // Check for cause property - note: requires ES2022 or later
    // If not available, this will safely be undefined
    const cause = (error as any).cause;
    if (cause) {
      return {
        ...formatted,
        cause: formatError(cause)
      };
    }
    
    return formatted;
  }
  return error;
} 