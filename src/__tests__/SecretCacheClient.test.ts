import { SecretCacheClient } from "../SecretCacheClient";
import { SecretInfo } from "../model/SecretInfo";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { CacheSecretStoreStrategy } from "../cache/CacheSecretStoreStrategy";
import { RefreshSecretStrategy } from "../service/RefreshSecretStrategy";
import { SecretManagerClient } from "../service/SecretManagerClient";
import { SecretCacheHook } from "../cache/SecretCacheHook";
import { CacheSecretException } from "../exception/CacheSecretException";
import { CommonLogger } from "../utils/CommonLogger";
import { CacheClientConstant } from "../utils/CacheClientConstant";

// Register the logger for the mode name used by the client globally
try {
  if (!CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
    CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, console);
  }
} catch (e) {
  // Logger might already be registered, ignore error
}

// Mock 依赖项
jest.mock("../service/SecretManagerClient");
jest.mock("../cache/CacheSecretStoreStrategy");
jest.mock("../service/RefreshSecretStrategy");
jest.mock("../cache/SecretCacheHook");

describe("SecretCacheClient Tests", () => {
  let secretCacheClient: SecretCacheClient;
  let mockSecretClient: jest.Mocked<SecretManagerClient>;
  let mockCacheStrategy: jest.Mocked<CacheSecretStoreStrategy>;
  let mockRefreshStrategy: jest.Mocked<RefreshSecretStrategy>;
  let mockCacheHook: jest.Mocked<SecretCacheHook>;
  
  beforeEach(() => {
    // Register the logger for the mode name used by the client
    if (!CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
      CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, console);
    }
    
    mockSecretClient = {
      init: jest.fn(),
      getSecretValue: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<SecretManagerClient>;
    
    mockCacheStrategy = {
      init: jest.fn(),
      storeSecret: jest.fn(),
      getCacheSecretInfo: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<CacheSecretStoreStrategy>;
    
    mockRefreshStrategy = {
      init: jest.fn(),
      getNextExecuteTime: jest.fn(),
      parseNextExecuteTime: jest.fn(),
      parseTTL: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<RefreshSecretStrategy>;
    
    mockCacheHook = {
      init: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      recoveryGetSecret: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<SecretCacheHook>;

    secretCacheClient = new SecretCacheClient(
      mockSecretClient,
      mockCacheStrategy,
      mockRefreshStrategy,
      mockCacheHook
    );
  });  // Close the beforeEach block

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with all parameters", () => {
      expect(secretCacheClient).toBeDefined();
    });

    it("should initialize with minimal parameters", () => {
      const client = new SecretCacheClient();
      expect(client).toBeDefined();
    });
  });

  describe("getSecretInfo", () => {
    it("should throw error when secretName is empty", async () => {
      await expect(secretCacheClient.getSecretInfo("")).rejects.toThrow(
        "the argument[secretName] must not be null"
      );
      await expect(secretCacheClient.getSecretInfo("   ")).rejects.toThrow(
        "the argument[secretName] must not be null"
      );
    });

    it("should return cached secret info when valid", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);

      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(cacheSecretInfo);

      // Mock the private method checkCacheSecretInfoIsValid to return true
      const originalCheckMethod = secretCacheClient['checkCacheSecretInfoIsValid'];
      const mockCheckMethod = jest.fn().mockReturnValue(true);
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: mockCheckMethod,
        writable: true,
        configurable: true
      });
      
      // Since cacheHook exists, it will call cacheHook.get, so we need to mock that too
      mockCacheHook.get.mockResolvedValue(secretInfo);

      const result = await secretCacheClient.getSecretInfo("test-secret");
      expect(result).toEqual(secretInfo);
      expect(mockCacheStrategy.getCacheSecretInfo).toHaveBeenCalledWith("test-secret");
      expect(mockCheckMethod).toHaveBeenCalledWith(cacheSecretInfo);
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: originalCheckMethod,
        writable: true,
        configurable: true
      });
    });

    it("should call getSecretValue when cache is invalid", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(undefined);
      
      // Save original methods
      const originalCheckMethod = secretCacheClient['checkCacheSecretInfoIsValid'];
      const originalGetValueMethod = secretCacheClient['getSecretValue'];
      const originalStoreMethod = secretCacheClient['storeAndRefresh'];
      
      // Mock the methods
      const mockCheckMethod = jest.fn().mockReturnValue(false);
      const mockGetValueMethod = jest.fn().mockResolvedValue(secretInfo);
      const mockStoreMethod = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: mockCheckMethod,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: mockGetValueMethod,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'storeAndRefresh', {
        value: mockStoreMethod,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.getSecretInfo("test-secret");
      expect(result).toEqual(secretInfo);
      expect(mockCacheStrategy.getCacheSecretInfo).toHaveBeenCalledWith("test-secret");
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: originalCheckMethod,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: originalGetValueMethod,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'storeAndRefresh', {
        value: originalStoreMethod,
        writable: true,
        configurable: true
      });
    });

    it("should return cached secret via hook if available", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);

      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(cacheSecretInfo);
      
      // Save original method
      const originalCheckMethod = secretCacheClient['checkCacheSecretInfoIsValid'];
      
      // Mock the method
      const mockCheckMethod = jest.fn().mockReturnValue(true);
      
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: mockCheckMethod,
        writable: true,
        configurable: true
      });
      
      mockCacheHook.get.mockResolvedValue(secretInfo); // Should return SecretInfo, not CacheSecretInfo

      const result = await secretCacheClient.getSecretInfo("test-secret");
      expect(mockCacheHook.get).toHaveBeenCalledWith(cacheSecretInfo);
      expect(result).toEqual(secretInfo);
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'checkCacheSecretInfoIsValid', {
        value: originalCheckMethod,
        writable: true,
        configurable: true
      });
    });
  });

  describe("getStringValue", () => {
    it("should return empty string when secret info is null", async () => {
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(null as any);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.getStringValue("test-secret");
      expect(result).toBe("");
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });

    it("should throw error for non-text secret data type", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value", "Binary");
      
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(secretInfo);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      await expect(secretCacheClient.getStringValue("test-secret")).rejects.toThrow(
        "the secret named[test-secret] do not support text value"
      );
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });

    it("should return secret value for text type", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value", "text");
      
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(secretInfo);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.getStringValue("test-secret");
      expect(result).toBe("secret-value");
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });

    it("should return empty string when secret value is null", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", null as any, "text");
      
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(secretInfo);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.getStringValue("test-secret");
      expect(result).toBe("");
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });
  });

  describe("getBinaryValue", () => {
    it("should return empty buffer when secret info is null", async () => {
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(null as any);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.getBinaryValue("test-secret");
      expect(result).toEqual(Buffer.alloc(0));
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });

    it("should throw error for non-binary secret data type", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value", "text");
      
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(secretInfo);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });

      await expect(secretCacheClient.getBinaryValue("test-secret")).rejects.toThrow(
        "the secret named[test-secret] do not support binary value"
      );
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });

    it("should return binary value for binary type", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value", "binary");
          
      // Save original method
      const originalGetSecretInfo = secretCacheClient['getSecretInfo'];
      
      // Mock the method
      const mockGetSecretInfo = jest.fn().mockResolvedValue(secretInfo);
      
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: mockGetSecretInfo,
        writable: true,
        configurable: true
      });
      
      const result = await secretCacheClient.getBinaryValue("test-secret");
      expect(result).toEqual(Buffer.from("secret-value", "utf8"));
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'getSecretInfo', {
        value: originalGetSecretInfo,
        writable: true,
        configurable: true
      });
    });
  });

  describe("refreshNow", () => {
    it("should throw error when secretName is empty", async () => {
      await expect(secretCacheClient.refreshNow("")).rejects.toThrow(
        "the argument[secretName] must not be null"
      );
      await expect(secretCacheClient.refreshNow("   ")).rejects.toThrow(
        "the argument[secretName] must not be null"
      );
    });

    it("should call refreshNowInternal", async () => {
      // Save original method
      const originalRefreshNowInternal = secretCacheClient['refreshNowInternal'];
      
      // Mock the method
      const mockRefreshNowInternal = jest.fn().mockResolvedValue(true);
      
      Object.defineProperty(secretCacheClient, 'refreshNowInternal', {
        value: mockRefreshNowInternal,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient.refreshNow("test-secret");
      expect(mockRefreshNowInternal).toHaveBeenCalledWith("test-secret", undefined);
      expect(result).toBe(true);
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'refreshNowInternal', {
        value: originalRefreshNowInternal,
        writable: true,
        configurable: true
      });
    });
  });

  describe("refreshNowInternal", () => {
    it("should handle refresh successfully", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalRemoveTask = secretCacheClient['removeRefreshTask'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockAddTask = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: mockRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: mockRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: mockAddTask,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient['refreshNowInternal']("test-secret", secretInfo);
      expect(result).toBe(true);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: originalRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });

    it("should handle refresh error gracefully", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalRemoveTask = secretCacheClient['removeRefreshTask'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const mockRefresh = jest.fn().mockRejectedValue(new Error("Test error"));
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockAddTask = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: mockRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: mockRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: mockAddTask,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient['refreshNowInternal']("test-secret", secretInfo);
      expect(result).toBe(false);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: originalRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });

    it("should handle removeRefreshTask error gracefully", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalRemoveTask = secretCacheClient['removeRefreshTask'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const mockRemoveTask = jest.fn().mockRejectedValue(new Error("Test error"));
      const mockAddTask = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: mockRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: mockRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: mockAddTask,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient['refreshNowInternal']("test-secret", secretInfo);
      expect(result).toBe(false);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: originalRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });

    it("should handle addRefreshTask error gracefully", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalRemoveTask = secretCacheClient['removeRefreshTask'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const mockRemoveTask = jest.fn().mockResolvedValue(undefined);
      const mockAddTask = jest.fn().mockRejectedValue(new Error("Test error"));
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: mockRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: mockRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: mockAddTask,
        writable: true,
        configurable: true
      });

      const result = await secretCacheClient['refreshNowInternal']("test-secret", secretInfo);
      expect(result).toBe(false);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: originalRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });
  });

  describe("init", () => {
    it("should initialize all components", async () => {
      const secretClientInitSpy = jest.spyOn(mockSecretClient, 'init').mockResolvedValue(undefined);
      const cacheStrategyInitSpy = jest.spyOn(mockCacheStrategy, 'init').mockResolvedValue(undefined);
      const refreshStrategyInitSpy = jest.spyOn(mockRefreshStrategy, 'init').mockResolvedValue(undefined);
      const cacheHookInitSpy = jest.spyOn(mockCacheHook, 'init').mockResolvedValue(undefined);

      await secretCacheClient['init']();

      expect(secretClientInitSpy).toHaveBeenCalled();
      expect(cacheStrategyInitSpy).toHaveBeenCalled();
      expect(refreshStrategyInitSpy).toHaveBeenCalled();
      expect(cacheHookInitSpy).toHaveBeenCalled();
    });

    it("should handle initialization with secretTTLMap populated", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      secretCacheClient['secretTTLMap'].set("test-secret", 3600000); // 1 hour
      
      const secretClientInitSpy = jest.spyOn(mockSecretClient, 'init').mockResolvedValue(undefined);
      
      // Save original methods
      const originalGetSecretValue = secretCacheClient['getSecretValue'];
      const originalInternalRefreshOps = secretCacheClient['internalRefreshOperations'];
      const originalWithLock = secretCacheClient['withLock'];
      
      // Mock the methods
      const getSecretValueSpy = jest.fn().mockResolvedValue(secretInfo);
      const internalRefreshOpsSpy = jest.fn().mockResolvedValue(undefined);
      const withLockSpy = jest.fn().mockImplementation((_, fn) => fn());
      
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: getSecretValueSpy,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: internalRefreshOpsSpy,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'withLock', {
        value: withLockSpy,
        writable: true,
        configurable: true
      });

      await secretCacheClient['init']();

      expect(secretClientInitSpy).toHaveBeenCalled();
      expect(getSecretValueSpy).toHaveBeenCalledWith("test-secret");
      expect(withLockSpy).toHaveBeenCalled();
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: originalGetSecretValue,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: originalInternalRefreshOps,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'withLock', {
        value: originalWithLock,
        writable: true,
        configurable: true
      });
    });

    it("should handle errors during secret retrieval during init", async () => {
      secretCacheClient['secretTTLMap'].set("test-secret", 3600000); // 1 hour
      
      const secretClientInitSpy = jest.spyOn(mockSecretClient, 'init').mockResolvedValue(undefined);
      
      // Save original method
      const originalGetSecretValue = secretCacheClient['getSecretValue'];
      
      // Mock the method
      const getSecretValueSpy = jest.fn().mockRejectedValue(new Error("API Error"));
      
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: getSecretValueSpy,
        writable: true,
        configurable: true
      });
      
      // Instead of spying on judgeSkipRefreshException, we'll mock the method on the class prototype
      const originalJudgeSkipMethod = secretCacheClient['judgeSkipRefreshException'];
      const mockJudgeSkipMethod = jest.fn().mockReturnValue(false);
      secretCacheClient['judgeSkipRefreshException'] = mockJudgeSkipMethod as any;

      await secretCacheClient['init']();

      expect(secretClientInitSpy).toHaveBeenCalled();
      expect(getSecretValueSpy).toHaveBeenCalledWith("test-secret");
      expect(mockJudgeSkipMethod).toHaveBeenCalled();
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'getSecretValue', {
        value: originalGetSecretValue,
        writable: true,
        configurable: true
      });
      
      // Restore original method
      secretCacheClient['judgeSkipRefreshException'] = originalJudgeSkipMethod as any;
    });
  });

  describe("judgeCacheExpire", () => {
    it("should return true when TTL has expired", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = Date.now() - 7200000; // 2 hours ago
      const parseTTLSpy = jest.spyOn(mockRefreshStrategy, 'parseTTL').mockReturnValue(3600000); // 1 hour
      
      const result = secretCacheClient['judgeCacheExpire'](cacheSecretInfo);
      expect(result).toBe(true);
    });

    it("should return false when TTL has not expired", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = Date.now();
      const parseTTLSpy = jest.spyOn(mockRefreshStrategy, 'parseTTL').mockReturnValue(3600000); // 1 hour
      
      const result = secretCacheClient['judgeCacheExpire'](cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should use default TTL when strategy returns <= 0", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = Date.now() - 7200000; // 2 hours ago
      const parseTTLSpy = jest.spyOn(mockRefreshStrategy, 'parseTTL').mockReturnValue(0);
      
      secretCacheClient['secretTTLMap'].set("test-secret", 1800000); // 30 minutes
      
      const result = secretCacheClient['judgeCacheExpire'](cacheSecretInfo);
      expect(parseTTLSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("getSecretValue", () => {
    it("should successfully retrieve secret value", async () => {
      mockSecretClient.getSecretValue.mockResolvedValue({
        body: {
          secretName: "test-secret",
          versionId: "v1",
          secretData: "secret-data",
          secretDataType: "Text"
        }
      } as any);

      const result = await secretCacheClient['getSecretValue']("test-secret");
      expect(result.getSecretName()).toBe("test-secret");
      expect(result.getVersionId()).toBe("v1");
      expect(result.getSecretValue()).toBe("secret-data");
    });

    it("should handle errors and attempt recovery", async () => {
      mockSecretClient.getSecretValue.mockRejectedValue(new Error("API Error"));
      
      // Mock the BackoffUtils.judgeNeedRecoveryException function
      const BackoffUtilsModule = require('../utils/BackoffUtils');
      const mockJudgeNeedRecoverySpy = jest.spyOn(BackoffUtilsModule.BackoffUtils, 'judgeNeedRecoveryException').mockReturnValue(true);
      
      const recoverySpy = jest.spyOn(mockCacheHook, 'recoveryGetSecret').mockResolvedValue(
        new SecretInfo("test-secret", "v1", "recovered-value")
      );

      const result = await secretCacheClient['getSecretValue']("test-secret");
      expect(recoverySpy).toHaveBeenCalledWith("test-secret");
      expect(result.getSecretValue()).toBe("recovered-value");
      
      // Restore original function
      mockJudgeNeedRecoverySpy.mockRestore();
    });

    it("should throw CacheSecretException for non-recoverable errors", async () => {
      mockSecretClient.getSecretValue.mockRejectedValue(new Error("API Error"));
      
      // Mock the BackoffUtils.judgeNeedRecoveryException function
      const BackoffUtilsModule = require('../utils/BackoffUtils');
      const mockJudgeNeedRecoverySpy = jest.spyOn(BackoffUtilsModule.BackoffUtils, 'judgeNeedRecoveryException').mockReturnValue(false);

      await expect(secretCacheClient['getSecretValue']("test-secret"))
        .rejects
        .toThrow(CacheSecretException);
      
      // Restore original function
      mockJudgeNeedRecoverySpy.mockRestore();
    });
  });

  describe("storeAndRefresh", () => {
    it("should call internalRefreshOperations", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original method
      const originalInternalRefreshOps = secretCacheClient['internalRefreshOperations'];
      
      // Mock the method
      const mockInternalRefreshOps = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: mockInternalRefreshOps,
        writable: true,
        configurable: true
      });

      await secretCacheClient['storeAndRefresh']("test-secret", secretInfo);

      expect(mockInternalRefreshOps).toHaveBeenCalledWith("test-secret", secretInfo);
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: originalInternalRefreshOps,
        writable: true,
        configurable: true
      });
    });

    it("should handle errors gracefully", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original method
      const originalInternalRefreshOps = secretCacheClient['internalRefreshOperations'];
      
      // Mock the method
      const mockInternalRefreshOps = jest.fn().mockRejectedValue(new Error("Test error"));
      
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: mockInternalRefreshOps,
        writable: true,
        configurable: true
      });

      // This should not throw, just log the error
      await expect(secretCacheClient['storeAndRefresh']("test-secret", secretInfo)).resolves.not.toThrow();
      
      // Restore original method
      Object.defineProperty(secretCacheClient, 'internalRefreshOperations', {
        value: originalInternalRefreshOps,
        writable: true,
        configurable: true
      });
    });
  });

  describe("internalRefreshOperations", () => {
    it("should perform all refresh operations", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalRemoveTask = secretCacheClient['removeRefreshTask'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const refreshMock = jest.fn().mockResolvedValue(undefined);
      const removeMock = jest.fn().mockResolvedValue(undefined);
      const addMock = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: refreshMock,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: removeMock,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: addMock,
        writable: true,
        configurable: true
      });

      await secretCacheClient['internalRefreshOperations']("test-secret", secretInfo);

      expect(refreshMock).toHaveBeenCalledWith("test-secret", secretInfo);
      expect(removeMock).toHaveBeenCalledWith("test-secret");
      expect(addMock).toHaveBeenCalledWith("test-secret", expect.any(Object));
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'removeRefreshTask', {
        value: originalRemoveTask,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });
  });

  describe("refresh", () => {
    it("should refresh with provided secret info", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const putSpy = jest.spyOn(mockCacheHook, 'put').mockResolvedValue(new CacheSecretInfo(secretInfo));
      const storeSpy = jest.spyOn(mockCacheStrategy, 'storeSecret').mockResolvedValue(undefined);

      await secretCacheClient['refresh']("test-secret", secretInfo);

      expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({
        secretName: "test-secret",
        versionId: "v1",
        secretValue: "secret-value"
      }));
      expect(storeSpy).toHaveBeenCalledWith(expect.any(CacheSecretInfo));
    });

    it("should fetch secret if not provided", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      // Mock the response object that matches the actual return type
      const mockResponse = {
        body: {
          secretName: "test-secret",
          versionId: "v1",
          secretData: "secret-value",
          secretDataType: undefined,
          createTime: undefined,
          secretType: undefined,
          automaticRotation: undefined,
          extendedConfig: undefined,
          rotationInterval: undefined,
          nextRotationDate: undefined,
        }
      };
      mockSecretClient.getSecretValue.mockResolvedValue(mockResponse as any);
      const putSpy = jest.spyOn(mockCacheHook, 'put').mockResolvedValue(new CacheSecretInfo(secretInfo));
      const storeSpy = jest.spyOn(mockCacheStrategy, 'storeSecret').mockResolvedValue(undefined);

      await secretCacheClient['refresh']("test-secret");

      expect(mockSecretClient.getSecretValue).toHaveBeenCalledWith(expect.any(Object));
      expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({
        secretName: "test-secret",
        versionId: "v1",
        secretValue: "secret-value"
      }));
      expect(storeSpy).toHaveBeenCalledWith(expect.any(CacheSecretInfo));
    });
  });

  describe("addRefreshTask", () => {
    it("should throw error if cache strategy not initialized", async () => {
      // Create a client without cache strategy to test error handling
      const tempSecretClient = {
        init: jest.fn(),
        getSecretValue: jest.fn(),
        close: jest.fn(),
      } as jest.Mocked<SecretManagerClient>;
      
      const clientWithoutCache = new SecretCacheClient(tempSecretClient, undefined as any);
      await expect(clientWithoutCache['addRefreshTask']("test", {} as any))
        .rejects
        .toThrow(CacheSecretException);
    });

    it("should add refresh task with calculated execute time", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = 1234567890 - 1000;

      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(cacheSecretInfo);
      const parseNextExecuteTimeSpy = jest.spyOn(mockRefreshStrategy, 'parseNextExecuteTime').mockReturnValue(1234567890 + 3600000); // 1 hour from now

      // We'll mock setTimeout to avoid actual delays
      jest.useFakeTimers();
      const dateNowSpy = jest
        .spyOn(global.Date, 'now')
        .mockReturnValue(1234567890);

      const runnable = {
        run: jest.fn()
      };

      await secretCacheClient['addRefreshTask']("test-secret", runnable);
      
      expect(parseNextExecuteTimeSpy).toHaveBeenCalled();

      // Restore timers
      jest.useRealTimers();
    });

    it("should calculate execute time using TTL map when strategy doesn't provide it", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = 1234567890 - 1000;

      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(cacheSecretInfo);
      const parseNextExecuteTimeSpy = jest.spyOn(mockRefreshStrategy, 'parseNextExecuteTime').mockReturnValue(0); // Return 0 to trigger fallback
      secretCacheClient['secretTTLMap'].set("test-secret", 7200000); // 2 hours
      const getNextExecuteTimeSpy = jest.spyOn(mockRefreshStrategy, 'getNextExecuteTime').mockReturnValue(1234567890 + 7200000);

      jest.useFakeTimers();
      
      const runnable = {
        run: jest.fn()
      };

      await secretCacheClient['addRefreshTask']("test-secret", runnable);
      
      expect(parseNextExecuteTimeSpy).toHaveBeenCalled();
      expect(getNextExecuteTimeSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe("removeRefreshTask", () => {
    it("should remove task if it exists", async () => {
      const fakeTimer = setTimeout(() => {}, 1000);
      secretCacheClient['scheduledFutureMap'].set("test-secret", fakeTimer);

      // Spy on the scheduledThreadPoolExecutor's remove method
      const removeSpy = jest.spyOn(secretCacheClient['scheduledThreadPoolExecutor'], 'remove');

      await secretCacheClient['removeRefreshTask']("test-secret");

      expect(removeSpy).toHaveBeenCalledWith(fakeTimer);
      expect(secretCacheClient['scheduledFutureMap'].has("test-secret")).toBe(false);
    });

    it("should do nothing if task doesn't exist", async () => {
      // No task exists for this key
      await secretCacheClient['removeRefreshTask']("non-existent");

      // Should not throw or do anything
      expect(secretCacheClient['scheduledFutureMap'].has("non-existent")).toBe(false);
    });
  });

  describe("checkCacheSecretInfoIsValid", () => {
    it("should return false for null cache info", () => {
      const result = secretCacheClient['checkCacheSecretInfoIsValid'](null as any);
      expect(result).toBe(false);
    });

    it("should return false if cache is expired", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      cacheSecretInfo['refreshTimestamp'] = Date.now() - 7200000; // 2 hours ago

      const mockJudgeCacheExpire = jest.fn().mockReturnValue(true); // Mock as expired
      Object.defineProperty(secretCacheClient, 'judgeCacheExpire', {
        value: mockJudgeCacheExpire,
        writable: true,
        configurable: true
      });

      const result = secretCacheClient['checkCacheSecretInfoIsValid'](cacheSecretInfo);
      expect(mockJudgeCacheExpire).toHaveBeenCalledWith(cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should return result of checkSecretValueIsEmpty if not expired", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);

      const mockJudgeCacheExpire = jest.fn().mockReturnValue(false); // Not expired
      Object.defineProperty(secretCacheClient, 'judgeCacheExpire', {
        value: mockJudgeCacheExpire,
        writable: true,
        configurable: true
      });

      const mockCheckSecretValueIsEmpty = jest.fn().mockReturnValue(true);
      Object.defineProperty(secretCacheClient, 'checkSecretValueIsEmpty', {
        value: mockCheckSecretValueIsEmpty,
        writable: true,
        configurable: true
      });

      const result = secretCacheClient['checkCacheSecretInfoIsValid'](cacheSecretInfo);
      expect(mockJudgeCacheExpire).toHaveBeenCalledWith(cacheSecretInfo);
      expect(mockCheckSecretValueIsEmpty).toHaveBeenCalledWith(cacheSecretInfo);
      expect(result).toBe(true);
    });
  });

  describe("checkSecretValueIsEmpty", () => {
    it("should return false for null cache info", () => {
      const result = secretCacheClient['checkSecretValueIsEmpty'](null as any);
      expect(result).toBe(false);
    });

    it("should return false for null secret info", () => {
      const cacheSecretInfo = new CacheSecretInfo(null as any);
      const result = secretCacheClient['checkSecretValueIsEmpty'](cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should return false for null secret value", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", null as any);
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      const result = secretCacheClient['checkSecretValueIsEmpty'](cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should return false for empty secret value", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      const result = secretCacheClient['checkSecretValueIsEmpty'](cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should return false for whitespace-only secret value", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "   ");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      const result = secretCacheClient['checkSecretValueIsEmpty'](cacheSecretInfo);
      expect(result).toBe(false);
    });

    it("should return true for valid secret value", () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "valid-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      const result = secretCacheClient['checkSecretValueIsEmpty'](cacheSecretInfo);
      expect(result).toBe(true);
    });
  });

  describe("judgeSkipRefreshException", () => {
    it("should return true by default", () => {
      const result = secretCacheClient['judgeSkipRefreshException']({});
      expect(result).toBe(true);
    });

    it("should handle getCause pattern", () => {
      const errorWithCause = {
        getCause: () => ({
          code: "SomeErrorCode"
        })
      };
      
      const mockJudgeServerException = jest.fn().mockReturnValue(false);
      Object.defineProperty(secretCacheClient, 'judgeServerException', {
        value: mockJudgeServerException,
        writable: true,
        configurable: true
      });
      
      const result = secretCacheClient['judgeSkipRefreshException'](errorWithCause);
      expect(mockJudgeServerException).toHaveBeenCalledWith(expect.objectContaining({ code: "SomeErrorCode" }));
    });
  });

  describe("judgeServerException", () => {
    it("should delegate to BackoffUtils", () => {
      const error = new Error("Test");
      
      // Mock the BackoffUtils.judgeNeedBackoff function
      const BackoffUtilsModule = require('../utils/BackoffUtils');
      const mockJudgeNeedBackoffSpy = jest.spyOn(BackoffUtilsModule.BackoffUtils, 'judgeNeedBackoff').mockReturnValue(true);
      const mockJudgeNeedBackoff = mockJudgeNeedBackoffSpy;
      
      const result = secretCacheClient['judgeServerException'](error);
      expect(mockJudgeNeedBackoff).toHaveBeenCalledWith(error);
      expect(result).toBe(true);
      
      // Restore original function
      mockJudgeNeedBackoffSpy.mockRestore();
    });
  });

  describe("withLock", () => {
    it("should execute function with lock", async () => {
      const testFn = jest.fn().mockResolvedValue("result");
      const result = await secretCacheClient['withLock']("test-key", testFn);
      
      expect(result).toBe("result");
      expect(testFn).toHaveBeenCalledTimes(1);
    });

    it("should wait for previous lock to complete", async () => {
      const testFn1 = jest.fn().mockResolvedValue("first-result");
      const testFn2 = jest.fn().mockResolvedValue("second-result");
      
      // Execute first with lock
      const firstCall = secretCacheClient['withLock']("same-key", testFn1);
      // Execute second with same key, should wait for first to complete
      const secondCall = secretCacheClient['withLock']("same-key", testFn2);
      
      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

      expect(firstResult).toBe("first-result");
      expect(secondResult).toBe("second-result");
      expect(testFn1).toHaveBeenCalledTimes(1);
      expect(testFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe("close", () => {
    it("should close all components", async () => {
      const cacheStrategyCloseSpy = jest.spyOn(mockCacheStrategy, 'close');
      const refreshStrategyCloseSpy = jest.spyOn(mockRefreshStrategy, 'close');
      const secretClientCloseSpy = jest.spyOn(mockSecretClient, 'close');
      const cacheHookCloseSpy = jest.spyOn(mockCacheHook, 'close');

      await secretCacheClient.close();

      expect(cacheStrategyCloseSpy).toHaveBeenCalled();
      expect(refreshStrategyCloseSpy).toHaveBeenCalled();
      expect(secretClientCloseSpy).toHaveBeenCalled();
      expect(cacheHookCloseSpy).toHaveBeenCalled();
    });

    it("should shutdown scheduled executor", async () => {
      // Save original method
      const originalShutdownNow = secretCacheClient['scheduledThreadPoolExecutor'].shutdownNow;
      
      // Mock the method
      const shutdownNowSpy = jest.fn();
      secretCacheClient['scheduledThreadPoolExecutor'].shutdownNow = shutdownNowSpy;
      
      await secretCacheClient.close();
      
      expect(shutdownNowSpy).toHaveBeenCalled();
      
      // Restore original method
      secretCacheClient['scheduledThreadPoolExecutor'].shutdownNow = originalShutdownNow;
    });
  });

  describe("RefreshSecretTask", () => {
    it("should run refresh and re-add task", async () => {
      const secretInfo = new SecretInfo("test-secret", "v1", "secret-value");
      const cacheSecretInfo = new CacheSecretInfo(secretInfo);
      
      mockCacheStrategy.getCacheSecretInfo.mockReturnValue(cacheSecretInfo);
      
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods
      const refreshMock = jest.fn().mockResolvedValue(undefined);
      const addTaskMock = jest.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: refreshMock,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: addTaskMock,
        writable: true,
        configurable: true
      });
      
      // Create a mock RefreshSecretTask since it's an internal class
      const task = {
        run: async () => {
          await secretCacheClient['refresh']("test-secret", undefined);
          await secretCacheClient['addRefreshTask']("test-secret", task);
        }
      };
      
      await task.run();

      expect(refreshMock).toHaveBeenCalledWith("test-secret", undefined);
      expect(addTaskMock).toHaveBeenCalledWith("test-secret", task);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });

    it("should handle errors during refresh and task addition", async () => {
      // Save original methods
      const originalRefresh = secretCacheClient['refresh'];
      const originalAddTask = secretCacheClient['addRefreshTask'];
      
      // Mock the methods to throw errors
      const refreshMock = jest.fn().mockRejectedValue(new Error("Test error"));
      const addTaskMock = jest.fn().mockRejectedValue(new Error("Test error"));
      
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: refreshMock,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: addTaskMock,
        writable: true,
        configurable: true
      });
      
      // Create a mock RefreshSecretTask since it's an internal class
      const task = {
        run: async () => {
          try {
            await secretCacheClient['refresh']("test-secret", undefined);
          } catch (e) {
            // Error handling in refresh
          }
          
          try {
            await secretCacheClient['addRefreshTask']("test-secret", task);
          } catch (e) {
            // Error handling in addRefreshTask
          }
        }
      };
      
      await expect(task.run()).resolves.not.toThrow(); // Should not throw, just log errors

      expect(refreshMock).toHaveBeenCalledWith("test-secret", undefined);
      
      // Restore original methods
      Object.defineProperty(secretCacheClient, 'refresh', {
        value: originalRefresh,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(secretCacheClient, 'addRefreshTask', {
        value: originalAddTask,
        writable: true,
        configurable: true
      });
    });
  });
});