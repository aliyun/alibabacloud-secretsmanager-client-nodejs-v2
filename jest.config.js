module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@alicloud|@darabonba)/)',
  ],
  modulePaths: [
    '<rootDir>',
    '<rootDir>/src',
  ],


  automock: false,
  collectCoverage: true,
  coverageReporters: ['text', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/main.ts',
  ],
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '[\\/]node_modules[\\/]',
    '\\.d\\.ts$',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/src/__tests__/__mocks__/',
    '(/__tests__|/tests__)/.*\\\.d\\.ts$'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};