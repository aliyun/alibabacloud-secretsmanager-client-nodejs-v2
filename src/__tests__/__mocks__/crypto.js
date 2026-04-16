// Mock for crypto module to handle Jest testing environment
const crypto = jest.requireActual('crypto');

module.exports = {
  ...crypto,
  randomBytes: jest.fn((size) => {
    return Buffer.alloc(size, 'mock');
  }),
  pbkdf2Sync: jest.fn((password, salt, iterations, keylen, digest) => {
    return Buffer.alloc(keylen, 'mock-key');
  }),
  createCipheriv: jest.fn(() => {
    return {
      update: jest.fn((data) => Buffer.from(data)),
      final: jest.fn(() => Buffer.from('mock-final')),
      setAutoPadding: jest.fn(),
    };
  }),
  createDecipheriv: jest.fn(() => {
    return {
      update: jest.fn((data) => Buffer.from(data)),
      final: jest.fn(() => Buffer.from('mock-decrypted')),
      setAutoPadding: jest.fn(),
    };
  })
};