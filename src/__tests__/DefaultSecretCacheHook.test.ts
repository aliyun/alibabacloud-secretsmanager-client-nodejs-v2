import { DefaultSecretCacheHook } from "../cache/DefaultSecretCacheHook";
import { SecretInfo } from "../model/SecretInfo";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { describe, expect, test } from "@jest/globals";

describe("DefaultSecretCacheHook", () => {
  test("should initialize with stage", () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");
    expect(hook).toBeDefined();
  });

  test("should put secret info and return CacheSecretInfo", async () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");
    const secretInfo = new SecretInfo(
      "test-secret-name",
      "1234567890",
      '{"key": "value"}',
    );

    const result = await hook.put(secretInfo);
    expect(result).toBeInstanceOf(CacheSecretInfo);
    expect(result.getSecretInfo().getSecretName()).toBe(
      secretInfo.getSecretName(),
    );
  });

  test("should handle null secret info", async () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");

    await expect((hook as any).put(null)).resolves.not.toThrow();
  });

  test("should handle secret info with different stages", async () => {
    const hook = new DefaultSecretCacheHook("CustomStage");
    const secretInfo = new SecretInfo(
      "test-secret-name",
      "1234567890",
      '{"key": "value"}',
      "text",
      "test-plat",
    );

    const result = await hook.put(secretInfo);
    expect(result).toBeInstanceOf(CacheSecretInfo);
  });

  test("should preserve secret info properties when converting", async () => {
    const secretName = "my-test-secret";
    const secretData = '{"credentials": "test123"}';
    const versionId = "9876543210";

    const hook = new DefaultSecretCacheHook("ACSCurrent");
    const secretInfo = new SecretInfo(
      secretName,
      versionId,
      secretData,
      "text",
    );

    const result = await hook.put(secretInfo);
    expect(result).toBeInstanceOf(CacheSecretInfo);
    expect(result.getSecretInfo().getSecretName()).toBe(secretName);
  });

  test("should get secret info from cache", async () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");
    const cacheSecretInfo = new CacheSecretInfo(
      new SecretInfo("cached-secret", "1234567890", "cached-data"),
    );

    const result = await hook.get(cacheSecretInfo);
    expect(result).toBeInstanceOf(SecretInfo);
    expect(result.getSecretName()).toBe("cached-secret");
  });

  test("should initialize properly", async () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");
    await expect(hook.init()).resolves.toBeUndefined();
  });

  test("should return undefined for recoveryGetSecret", async () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");

    const result = await hook.recoveryGetSecret("test-secret");
    expect(result).toBeUndefined();
  });

  test("should close without errors", () => {
    const hook = new DefaultSecretCacheHook("ACSCurrent");

    expect(() => hook.close()).not.toThrow();
  });
});
