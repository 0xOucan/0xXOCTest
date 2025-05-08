import { createLogger, LogLevel, getRecentLogs, formatError } from '../../utils/logger';

// Mock console methods
console.debug = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
  });

  test('createLogger returns a logger object with all log level methods', () => {
    const logger = createLogger('test-module');
    
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('fatal');
    
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
  });

  test('logger methods call console with correct level', () => {
    const logger = createLogger('test-module');
    
    logger.debug('Debug message');
    expect(console.debug).toHaveBeenCalled();
    
    logger.info('Info message');
    expect(console.info).toHaveBeenCalled();
    
    logger.warn('Warning message');
    expect(console.warn).toHaveBeenCalled();
    
    logger.error('Error message');
    expect(console.error).toHaveBeenCalled();
    
    logger.fatal('Fatal message');
    expect(console.error).toHaveBeenCalled();
  });

  test('getRecentLogs returns logs filtered by level', () => {
    // Create logger and add logs of different levels
    const logger = createLogger('test-module');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Get logs filtered by level
    const errorLogs = getRecentLogs(LogLevel.ERROR);
    
    // Should only include error logs
    expect(errorLogs.length).toBeGreaterThan(0);
    errorLogs.forEach(log => {
      expect(log.level).toBe(LogLevel.ERROR);
    });
  });

  test('formatError correctly formats Error objects', () => {
    const testError = new Error('Test error message');
    const formatted = formatError(testError);
    
    expect(formatted).toHaveProperty('name', 'Error');
    expect(formatted).toHaveProperty('message', 'Test error message');
    expect(formatted).toHaveProperty('stack');
  });
}); 