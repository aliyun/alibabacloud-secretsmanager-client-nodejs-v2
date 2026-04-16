import { AESUtils } from "../utils/AESUtils";
import { AESConst } from "../utils/AESConst";
import { describe, expect, test } from "@jest/globals";

describe("AESUtils", () => {
  test("should encrypt and decrypt data correctly", () => {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const secret = new Uint8Array(32);
    const iv = new Uint8Array(16);
    const salt = "test-salt";
    const data = new TextEncoder().encode("Hello, World!");

    // 填充随机数据
    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }
    for (let i = 0; i < iv.length; i++) {
      iv[i] = i;
    }

    const encrypted = AESUtils.encrypt(mode, data, secret, iv, salt);
    expect(encrypted).toBeDefined();
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = AESUtils.decrypt(mode, encrypted, secret, iv, salt);
    expect(decrypted).toBe("Hello, World!");
  });

  test("should handle empty data", () => {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const secret = new Uint8Array(32);
    const iv = new Uint8Array(16);
    const salt = "test-salt";
    const data = new Uint8Array(0);

    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }
    for (let i = 0; i < iv.length; i++) {
      iv[i] = i;
    }

    const encrypted = AESUtils.encrypt(mode, data, secret, iv, salt);
    const decrypted = AESUtils.decrypt(mode, encrypted, secret, iv, salt);
    expect(decrypted).toBe("");
  });

  test("should handle unicode characters", () => {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const secret = new Uint8Array(32);
    const iv = new Uint8Array(16);
    const salt = "test-salt-中文";
    const data = new TextEncoder().encode("Hello 世界! 🌍");

    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }
    for (let i = 0; i < iv.length; i++) {
      iv[i] = i;
    }

    const encrypted = AESUtils.encrypt(mode, data, secret, iv, salt);
    const decrypted = AESUtils.decrypt(mode, encrypted, secret, iv, salt);
    expect(decrypted).toBe("Hello 世界! 🌍");
  });

  test("should throw error with wrong key", () => {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const secret = new Uint8Array(32);
    const iv = new Uint8Array(16);
    const salt = "test-salt";
    const data = new TextEncoder().encode("Hello, World!");

    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }
    for (let i = 0; i < iv.length; i++) {
      iv[i] = i;
    }

    const encrypted = AESUtils.encrypt(mode, data, secret, iv, salt);

    // 使用错误的密钥
    const wrongSecret = new Uint8Array(32);
    for (let i = 0; i < wrongSecret.length; i++) {
      wrongSecret[i] = i + 1;
    }

    expect(() => {
      AESUtils.decrypt(mode, encrypted, wrongSecret, iv, salt);
    }).toThrow();
  });

  test("should throw error with wrong salt", () => {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const secret = new Uint8Array(32);
    const iv = new Uint8Array(16);
    const salt = "test-salt";
    const data = new TextEncoder().encode("Hello, World!");

    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }
    for (let i = 0; i < iv.length; i++) {
      iv[i] = i;
    }

    const encrypted = AESUtils.encrypt(mode, data, secret, iv, salt);

    expect(() => {
      AESUtils.decrypt(mode, encrypted, secret, iv, "wrong-salt");
    }).toThrow();
  });
});
