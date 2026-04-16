import { SecretCacheClientBuilder } from "../SecretCacheClientBuilder";
import { SecretCacheClient } from "../SecretCacheClient";
import { CacheSecretStoreStrategy } from "../cache/CacheSecretStoreStrategy";
import { RefreshSecretStrategy } from "../service/RefreshSecretStrategy";
import { SecretCacheHook } from "../cache/SecretCacheHook";
import { SecretManagerClient } from "../service/SecretManagerClient";
import { MemoryCacheSecretStoreStrategy } from "../cache/MemoryCacheSecretStoreStrategy";
import { DefaultRefreshSecretStrategy } from "../service/DefaultRefreshSecretStrategy";
import { DefaultSecretCacheHook } from "../cache/DefaultSecretCacheHook";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { CommonLogger } from "../utils/CommonLogger";
import {
  GetSecretValueResponseBody,
  GetSecretValueResponse,
} from "@alicloud/kms20160120";
class MockSecretManagerClient implements SecretManagerClient {
  async init(): Promise<void> {}
  async getSecretValue(): Promise<GetSecretValueResponse> {
    const responseBody = new GetSecretValueResponseBody({
      requestId: "test-request-id",
      secretName: "test-secret",
      versionId: "v1",
      secretData: "test-data",
      secretDataType: "text",
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
  async init(): Promise<void> {}
  async storeSecret(): Promise<void> {}
  getCacheSecretInfo(): any {
    return undefined;
  }
  close(): void {}
}

class MockRefreshSecretStrategy implements RefreshSecretStrategy {
  async init(): Promise<void> {}
  getNextExecuteTime(): number {
    return 0;
  }
  parseNextExecuteTime(): number {
    return 0;
  }
  parseTTL(): number {
    return 0;
  }
  close?(): void {}
}

class MockCacheSecretHook implements SecretCacheHook {
  async init(): Promise<void> {}
  async get(): Promise<any> {
    return {};
  }
  async put(): Promise<any> {
    return {};
  }
  async judgeNeedRecovery(): Promise<boolean> {
    return false;
  }
  async recoveryGetSecret(): Promise<any> {
    return undefined;
  }
  close(): void {}
}

describe("SecretCacheClientBuilder", () => {
  let builder: SecretCacheClientBuilder;

  beforeAll(() => {
    if (!CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
      CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, console);
    }
  });

  beforeEach(() => {
    builder = new SecretCacheClientBuilder();
  });

  afterEach(() => {
    delete process.env.cache_client_region_id;
    delete process.env.credentials_type;
    delete process.env.credentials_access_key_id;
    delete process.env.credentials_access_secret;
  });

  describe("newClient", () => {
    it("should create a new SecretCacheClient instance", async () => {
      process.env.cache_client_region_id = JSON.stringify([
        { regionId: "cn-hangzhou" },
      ]);

      const client = await SecretCacheClientBuilder.newClient();

      delete process.env.cache_client_region_id;

      expect(client).toBeInstanceOf(SecretCacheClient);
    });
  });

  describe("newCacheClientBuilder", () => {
    it("should create a new builder with specified client", () => {
      const mockClient = new MockSecretManagerClient();
      const newBuilder =
        SecretCacheClientBuilder.newCacheClientBuilder(mockClient);
      expect(newBuilder).toBeInstanceOf(SecretCacheClientBuilder);
    });
  });

  describe("withSecretTTL", () => {
    it("should set TTL for a specific secret", () => {
      const result = builder.withSecretTTL("test-secret", 1000);
      expect(result).toBe(builder);
    });
  });

  describe("withParseJSONTTL", () => {
    it("should set JSON TTL property name", () => {
      const result = builder.withParseJSONTTL("custom-ttl");
      expect(result).toBe(builder);
    });
  });

  describe("withRefreshSecretStrategy", () => {
    it("should set refresh secret strategy", () => {
      const mockStrategy = new MockRefreshSecretStrategy();
      const result = builder.withRefreshSecretStrategy(mockStrategy);
      expect(result).toBe(builder);
    });
  });

  describe("withCacheSecretStrategy", () => {
    it("should set cache secret strategy", () => {
      const mockStrategy = new MockCacheSecretStoreStrategy();
      const result = builder.withCacheSecretStrategy(mockStrategy);
      expect(result).toBe(builder);
    });
  });

  describe("withCacheStage", () => {
    it("should set cache stage", () => {
      const result = builder.withCacheStage("ACSCurrent");
      expect(result).toBe(builder);
    });
  });

  describe("withSecretCacheHook", () => {
    it("should set cache hook", () => {
      const mockHook = new MockCacheSecretHook();
      const result = builder.withSecretCacheHook(mockHook);
      expect(result).toBe(builder);
    });
  });

  describe("withLogger", () => {
    it("should set logger", () => {
      const consoleMock = console;
      const result = builder.withLogger(consoleMock);
      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build a SecretCacheClient with default components", async () => {
      process.env.cache_client_region_id = JSON.stringify([
        { regionId: "cn-hangzhou" },
      ]);

      const client = await builder.build();

      delete process.env.cache_client_region_id;

      expect(client).toBeInstanceOf(SecretCacheClient);
    });

    it("should build a SecretCacheClient with custom components", async () => {
      const mockClient = new MockSecretManagerClient();
      const mockCacheStrategy = new MemoryCacheSecretStoreStrategy();
      const mockRefreshStrategy = new DefaultRefreshSecretStrategy();
      const mockHook = new DefaultSecretCacheHook(
        CacheClientConstant.STAGE_ACS_CURRENT,
      );

      const customBuilder = new SecretCacheClientBuilder();
      customBuilder["secretCacheClient"] = new SecretCacheClient(
        mockClient,
        mockCacheStrategy,
        mockRefreshStrategy,
        mockHook,
      );

      const client = await customBuilder.build();
      expect(client).toBeInstanceOf(SecretCacheClient);
    });
  });
});
