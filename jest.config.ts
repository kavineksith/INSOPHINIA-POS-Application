import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  displayName: 'insophinia-pos',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Let next/jest handle transforms — do NOT add a manual ts-jest transform
  // as it conflicts with next/jest's built-in SWC transform.
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/lib/email.ts',
    '!src/lib/billTemplate.ts',
    '!src/lib/supabase-storage.ts',
    '!src/lib/seed.js',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Force Jest to compile these ESM modules regardless of the environment
  transformIgnorePatterns: [
    '/node_modules/(?!(otplib|@otplib|@scure|@noble)/)',
  ],
  // Mock these modules globally
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};

// Export wrapped configuration to override Next.js defaults dynamically
export default async () => {
  const nextJestConfig = await createJestConfig(config)();
  
  // Hard-override Next.js built-in ignore patterns to ensure CI/CD (GitHub Actions) transpiles ESM packages
  // This bypasses issues where ts-node fails to parse next.config.ts transpilePackages in Ubuntu runners
  nextJestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(otplib|@otplib|@scure|@noble)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  
  return nextJestConfig;
};
