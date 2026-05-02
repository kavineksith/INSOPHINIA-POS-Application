/**
 * Log Manager Mock — auto-resolved by Jest for jest.mock('@/lib/log-manager')
 */
export const logManager = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};
export const appendSystemLog = jest.fn().mockResolvedValue(undefined);
export default logManager;
