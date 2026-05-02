/**
 * Email Service Mock
 * No-op mock to prevent actual email sending during tests.
 */

export const sendEmail = jest.fn().mockResolvedValue(undefined);
