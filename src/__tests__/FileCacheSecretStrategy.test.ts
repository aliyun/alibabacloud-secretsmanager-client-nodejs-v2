import { FileCacheSecretStoreStrategy } from "../cache/FileCacheSecretStoreStrategy";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";
import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import * as path from "path";

beforeEach(() => {
  try {
    jest.spyOn(path, "join").mockImplementation((...args) => args.join("/"));
  } catch (error) {}
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("FileCacheSecretStoreStrategy", () => {
  test("should initialize with default parameters", () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./cache",
      true,
      "test-salt",
    );
    expect(strategy).toBeDefined();
  });

  test("should initialize with custom parameters", () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "#cacheSecretPath#",
      true,
      "#salt#",
    );
    expect(strategy).toBeDefined();
  });

  test("should store secret successfully", async () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache",
      true,
      "test-salt",
    );
    await strategy.init();

    const secretInfo = new CacheSecretInfo(
      new SecretInfo("test-secret", "1234567890", "test-secret-data"),
      "test-plat",
      Date.now(),
    );

    await expect(async () => {
      await strategy.storeSecret(secretInfo);
    }).not.toThrow();
  });

  test("should get cached secret info", () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache",
      true,
      "test-salt",
    );

    const result = strategy.getCacheSecretInfo("non-existent-secret");
    expect(result).toBeUndefined();
  });

  test("should handle storing and retrieving the same secret", async () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache2",
      true,
      "test-salt2",
    );
    await strategy.init();
    const secretName = "test-secret-name";

    const secretInfo = new CacheSecretInfo(
      new SecretInfo(secretName, Date.now().toString(), "test-data"),
      "ACSCurrent",
      Date.now(),
    );

    await expect(async () => {
      await strategy.storeSecret(secretInfo);
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const retrieved = strategy.getCacheSecretInfo(secretName);
    expect(retrieved).toBeDefined();
  });

  test("should initialize properly", async () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache-init",
      true,
      "test-salt",
    );

    await expect(async () => {
      await strategy.init();
    }).not.toThrow();
  });

  test("should close without errors", () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache-close",
      true,
      "test-salt",
    );

    expect(() => strategy.close()).not.toThrow();
  });

  test("should work with empty salt after initialization", async () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache-empty",
      true,
      "",
    );

    await expect(strategy.init()).rejects.toThrow(
      "the argument[salt] must not be null",
    );
  });

  test("should serialize and deserialize CacheSecretInfo correctly", async () => {
    const strategy = new FileCacheSecretStoreStrategy(
      "./test-cache-serialize",
      true,
      "test-salt-for-serialize",
    );
    await strategy.init();
    const secretName = "serialize-test-secret";

    const originalSecretInfo = new CacheSecretInfo(
      new SecretInfo(
        secretName,
        "v1",
        "test-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      ),
      "ACSCurrent",
      Date.now(),
    );

    await strategy.storeSecret(originalSecretInfo);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const retrieved = strategy.getCacheSecretInfo(secretName);

    expect(retrieved).toBeDefined();

    if (retrieved) {
      expect(() => retrieved.getSecretInfo()).not.toThrow();
      expect(retrieved.getSecretInfo()).toBeDefined();
      expect(retrieved.getSecretInfo().getSecretName()).toBe(secretName);

      expect(retrieved.getStage()).toBe("ACSCurrent");
      expect(() => retrieved.getRefreshTimestamp()).not.toThrow();
    }
  });
});
