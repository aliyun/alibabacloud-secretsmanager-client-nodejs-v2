import { DefaultRefreshSecretStrategy } from "../service/DefaultRefreshSecretStrategy";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";

describe("DefaultRefreshSecretStrategy", () => {
  let strategy: DefaultRefreshSecretStrategy;

  beforeEach(() => {
    strategy = new DefaultRefreshSecretStrategy();
  });

  describe("constructor", () => {
    it("should initialize with undefined property name", () => {
      const s = new DefaultRefreshSecretStrategy();
      expect(s).toBeDefined();
    });

    it("should initialize with provided property name", () => {
      const s = new DefaultRefreshSecretStrategy("customTTL");
      expect(s).toBeDefined();
    });
  });

  describe("init", () => {
    it("should return promise resolved", async () => {
      await expect(strategy.init()).resolves.toBeUndefined();
    });
  });

  describe("parseTTL", () => {
    it("should return -1 when jsonTTLPropertyName is empty", () => {
      const s = new DefaultRefreshSecretStrategy("");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 3600}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should return -1 when jsonTTLPropertyName is whitespace", () => {
      const s = new DefaultRefreshSecretStrategy("   ");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 3600}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should return TTL value when property exists as number", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 3600}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(3600);
    });

    it("should return TTL value when property exists as string number", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": "3600"}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(3600);
    });

    it("should return -1 when property does not exist in JSON", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"other": 3600}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should return -1 when JSON is invalid", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "{invalid json}",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should return -1 when JSON value is not numeric", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": "not_a_number"}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should return -1 when JSON value is null", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": null}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-1);
    });

    it("should handle zero TTL value", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 0}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(0);
    });

    it("should round decimal TTL value", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 3600.7}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(3601);
    });

    it("should handle negative TTL value", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": -100}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const result = s.parseTTL(secretInfo);
      expect(result).toBe(-100);
    });
  });

  describe("getNextExecuteTime", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 0, 1, 12, 0, 0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return ttl + offsetTimestamp when it is in the future", () => {
      const secretName = "test-secret";
      const ttl = 7200000;
      const offsetTimestamp = Date.now() + 3600000;

      const result = strategy.getNextExecuteTime(
        secretName,
        ttl,
        offsetTimestamp,
      );
      expect(result).toBe(ttl + offsetTimestamp);
    });

    it("should return now + ttl when ttl + offsetTimestamp is in the past", () => {
      const secretName = "test-secret";
      const ttl = 7200000;
      const offsetTimestamp = Date.now() - 10800000;

      const result = strategy.getNextExecuteTime(
        secretName,
        ttl,
        offsetTimestamp,
      );
      expect(result).toBe(Date.now() + ttl);
    });
  });

  describe("parseNextExecuteTime", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 0, 1, 12, 0, 0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return -1 when TTL is <= 0", () => {
      const s = new DefaultRefreshSecretStrategy("nonexistent");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"other": 3600}',
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

      const result = s.parseNextExecuteTime(cacheSecretInfo);
      expect(result).toBe(-1);
    });

    it("should calculate next execute time based on TTL and refresh timestamp", () => {
      const s = new DefaultRefreshSecretStrategy("ttl");
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        '{"ttl": 7200000}',
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );
      const refreshTimestamp = Date.now() - 3600000;
      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        refreshTimestamp,
      );

      const result = s.parseNextExecuteTime(cacheSecretInfo);
      expect(result).toBeGreaterThan(Date.now());
    });
  });

  describe("close", () => {
    it("should be defined", () => {
      expect(strategy.close).toBeDefined();
      expect(typeof strategy.close).toBe("function");
    });

    it("should be callable without errors", () => {
      expect(() => strategy.close?.()).not.toThrow();
    });
  });
});
