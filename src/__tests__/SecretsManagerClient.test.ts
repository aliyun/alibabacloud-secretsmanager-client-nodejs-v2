import { SecretCacheClient } from "../SecretCacheClient";
import { SecretInfo } from "../model/SecretInfo";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { CacheSecretStoreStrategy } from "../cache/CacheSecretStoreStrategy";
import { RefreshSecretStrategy } from "../service/RefreshSecretStrategy";
import { SecretCacheHook } from "../cache/SecretCacheHook";
import { SecretManagerClient } from "../service/SecretManagerClient";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { CommonLogger } from "../utils/CommonLogger";
import { CacheSecretException } from "../exception/CacheSecretException";
import {
  GetSecretValueResponse,
  GetSecretValueResponseBody,
} from "@alicloud/kms20160120";

class MockSecretManagerClient implements SecretManagerClient {
  async init(): Promise<void> {}
  async getSecretValue(request?: any): Promise<any> {
    const secretName = request?.body?.secretName || "test-secret";
    let secretDataType = "text";
    let secretData = "test-data";

    if (secretName.includes("binary")) {
      secretDataType = "binary";
      secretData = "dGVzdC1iaW5hcnktZGF0YQ==";
    } else if (secretName.includes("text")) {
      secretDataType = "text";
      secretData = "test-data";
    }
    const responseBody = new GetSecretValueResponseBody({
      requestId: "test-request-id",
      secretName: secretName,
      versionId: "v1",
      secretData: secretData,
      secretDataType: secretDataType,
      createTime: "2023-01-01T00:00:00Z",
      secretType: "Generic",
      automaticRotation: "Disabled",
      extendedConfig: "{}",
      rotationInterval: "30d",
      nextRotationDate: "2023-02-01T00:00:00Z",
    });

    return new GetSecretValueResponse({
      headers: {},
      statusCode: 200,
      body: responseBody,
    });
  }
  close(): void {}
}

class MockCacheSecretStoreStrategy implements CacheSecretStoreStrategy {
  private cache = new Map<string, CacheSecretInfo>();

  async init(): Promise<void> {}
  async storeSecret(cacheSecretInfo: CacheSecretInfo): Promise<void> {
    const secretName = cacheSecretInfo.getSecretInfo().getSecretName();
    this.cache.set(secretName, cacheSecretInfo);
  }
  getCacheSecretInfo(secretName: string): CacheSecretInfo | undefined {
    return this.cache.get(secretName);
  }
  close(): void {}
}

class MockRefreshSecretStrategy implements RefreshSecretStrategy {
  async init(): Promise<void> {}
  getNextExecuteTime(): number {
    return Date.now() + 3600000;
  }
  parseNextExecuteTime(cacheSecretInfo: CacheSecretInfo): number {
    return Date.now() + 3600000;
  }
  parseTTL(secretInfo: SecretInfo): number {
    return 3600000;
  }
  close?(): void {}
}

class MockCacheSecretHook implements SecretCacheHook {
  async init(): Promise<void> {}
  async get(cacheSecretInfo: CacheSecretInfo): Promise<SecretInfo> {
    return cacheSecretInfo.getSecretInfo();
  }
  async put(secretInfo: SecretInfo): Promise<CacheSecretInfo> {
    return new CacheSecretInfo(
      secretInfo,
      CacheClientConstant.STAGE_ACS_CURRENT,
      Date.now(),
    );
  }
  async judgeNeedRecovery(): Promise<boolean> {
    return false;
  }
  async recoveryGetSecret(): Promise<any> {
    return undefined;
  }
  close(): void {}
}

describe("SecretCacheClient", () => {
  let client: SecretCacheClient;
  let mockSecretManagerClient: MockSecretManagerClient;
  let mockCacheStrategy: MockCacheSecretStoreStrategy;
  let mockRefreshStrategy: MockRefreshSecretStrategy;
  let mockHook: MockCacheSecretHook;

  beforeAll(() => {
    if (!CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
      CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, console);
    }
  });

  beforeEach(() => {
    mockSecretManagerClient = new MockSecretManagerClient();
    mockCacheStrategy = new MockCacheSecretStoreStrategy();
    mockRefreshStrategy = new MockRefreshSecretStrategy();
    mockHook = new MockCacheSecretHook();

    client = new SecretCacheClient(
      mockSecretManagerClient,
      mockCacheStrategy,
      mockRefreshStrategy,
      mockHook,
    );
  });

  afterEach(async () => {
    await client.close();
  });

  describe("constructor", () => {
    it("should initialize with provided parameters", () => {
      expect(client).toBeDefined();
      expect((client as any).secretClient).toBe(mockSecretManagerClient);
      expect((client as any).cacheSecretStoreStrategy).toBe(mockCacheStrategy);
      expect((client as any).refreshSecretStrategy).toBe(mockRefreshStrategy);
      expect((client as any).cacheHook).toBe(mockHook);
    });

    it("should initialize with default parameters", () => {
      const defaultClient = new SecretCacheClient();
      expect(defaultClient).toBeDefined();
    });
  });

  describe("getSecretInfo", () => {
    it("should throw error for empty secret name", async () => {
      await expect(client.getSecretInfo("")).rejects.toThrow(
        "the argument[secretName] must not be null",
      );
      await expect(client.getSecretInfo("   ")).rejects.toThrow(
        "the argument[secretName] must not be null",
      );
    });

    it("should return cached secret info if valid", async () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "cached-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        Date.now(),
      );
      mockCacheStrategy.storeSecret(cacheSecretInfo);

      const result = await client.getSecretInfo("test-secret");
      expect(result).toBeInstanceOf(SecretInfo);
      expect(result.getSecretName()).toBe("test-secret");
    });

    it("should fetch and cache secret info if not cached", async () => {
      const result = await client.getSecretInfo("test-secret");
      expect(result).toBeInstanceOf(SecretInfo);
      expect(result.getSecretName()).toBe("test-secret");
      expect(result.getSecretValue()).toBe("test-data");
    });
  });

  describe("getStringValue", () => {
    it("should return secret value as string", async () => {
      const result = await client.getStringValue("test-secret");
      expect(typeof result).toBe("string");
      expect(result).toBe("test-data");
    });

    it("should return empty string for non-existent secret info", async () => {
      jest.spyOn(client, "getSecretInfo").mockResolvedValue(null as any);
      const result = await client.getStringValue("nonexistent");
      expect(result).toBe("");
    });

    it("should throw error for non-text secret data type", async () => {
      const binarySecretInfo = new SecretInfo(
        "binary-secret",
        "v1",
        "binary-data",
        "binary",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      jest.spyOn(client, "getSecretInfo").mockResolvedValue(binarySecretInfo);

      await expect(client.getStringValue("binary-secret")).rejects.toThrow(
        "the secret named[binary-secret] do not support text value",
      );
    });
  });

  describe("getBinaryValue", () => {
    it("should return secret value as buffer", async () => {
      const binarySecretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "test-data",
        "binary",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      jest.spyOn(client, "getSecretInfo").mockResolvedValue(binarySecretInfo);

      const result = await client.getBinaryValue("test-secret");
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe("test-data");
    });

    it("should return empty buffer for non-existent secret info", async () => {
      jest.spyOn(client, "getSecretInfo").mockResolvedValue(null as any);
      const result = await client.getBinaryValue("nonexistent");
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should throw CacheSecretException for non-binary secret data type", async () => {
      const textSecretInfo = new SecretInfo(
        "text-secret",
        "v1",
        "text-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      jest.spyOn(client, "getSecretInfo").mockResolvedValue(textSecretInfo);

      await expect(client.getBinaryValue("text-secret")).rejects.toThrow(
        CacheSecretException,
      );
    });
  });

  describe("refreshNow", () => {
    it("should throw error for empty secret name", async () => {
      await expect(client.refreshNow("")).rejects.toThrow(
        "the argument[secretName] must not be null",
      );
      await expect(client.refreshNow("   ")).rejects.toThrow(
        "the argument[secretName] must not be null",
      );
    });

    it("should return true for successful refresh", async () => {
      const result = await client.refreshNow("test-secret");
      expect(typeof result).toBe("boolean");
    });
  });

  describe("close", () => {
    it("should close all components", async () => {
      const secretClientCloseSpy = jest.spyOn(mockSecretManagerClient, "close");
      const cacheStrategyCloseSpy = jest.spyOn(mockCacheStrategy, "close");
      const refreshStrategyCloseSpy = jest.fn();
      (mockRefreshStrategy as any).close = refreshStrategyCloseSpy;
      const hookCloseSpy = jest.spyOn(mockHook, "close");

      await client.close();

      expect(secretClientCloseSpy).toHaveBeenCalled();
      expect(cacheStrategyCloseSpy).toHaveBeenCalled();
      expect(refreshStrategyCloseSpy).toHaveBeenCalled();
      expect(hookCloseSpy).toHaveBeenCalled();
    });
  });

  describe("checkCacheSecretInfoIsValid", () => {
    it("should return false for expired cache secret info", () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "test-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const oldTimestamp = Date.now() - 7200000;
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        oldTimestamp,
      );

      const isValid = (client as any).checkCacheSecretInfoIsValid(
        cacheSecretInfo,
      );
      expect(isValid).toBe(false);
    });

    it("should return false for cache with empty value", () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        Date.now(),
      );

      const isValid = (client as any).checkCacheSecretInfoIsValid(
        cacheSecretInfo,
      );
      expect(isValid).toBe(false);
    });

    it("should return true for valid cache secret info", () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "valid-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        Date.now(),
      );

      const isValid = (client as any).checkCacheSecretInfoIsValid(
        cacheSecretInfo,
      );
      expect(isValid).toBe(true);
    });
  });

  describe("judgeCacheExpire", () => {
    it("should return true for expired cache entry", () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "test-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const oldTimestamp = Date.now() - 7200000;
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        oldTimestamp,
      );

      const isExpired = (client as any).judgeCacheExpire(cacheSecretInfo);
      expect(isExpired).toBe(true);
    });

    it("should return false for non-expired cache entry", () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "test-data",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        Date.now(),
      );

      const isExpired = (client as any).judgeCacheExpire(cacheSecretInfo);
      expect(isExpired).toBe(false);
    });
  });
});
