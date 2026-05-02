/**
 * Log Manager Mock
 * No-op mock to prevent actual log writing during tests.
 */

export const appendSystemLog = jest.fn().mockResolvedValue(undefined);
