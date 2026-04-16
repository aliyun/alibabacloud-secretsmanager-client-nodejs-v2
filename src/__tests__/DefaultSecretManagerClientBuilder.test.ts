import { DefaultSecretManagerClientBuilder, DefaultSecretManagerClient } from "../service/DefaultSecretManagerClientBuilder";
import { RegionInfo } from "../model/RegionInfo";
import { Config } from "@alicloud/openapi-client";
import { BackoffStrategy } from "../service/BackoffStrategy";
import { GetSecretValueRequest } from "@alicloud/kms20160120";
import * as credentials from "@alicloud/credentials";

// Mock the external dependencies
jest.mock("@alicloud/kms20160120", () => {
  // Define the mock implementations
  const GetSecretValueRequest = jest.fn().mockImplementation((args) => {
    return {
      secretName: args?.secretName,
      versionStage: args?.versionStage,
      fetchExtendedConfig: args?.fetchExtendedConfig,
    };
  });
  const GetSecretValueResponse = jest.fn();
  
  // Create a mock class that can be instantiated
  class Kms20160120 {
    config: any;
    getSecretValue: any;
    
    constructor(config?: any) {
      this.config = config;
      this.getSecretValue = jest.fn().mockResolvedValue({
        body: {
          secretName: "test-secret",
          versionId: "v1",
          secretData: "secret-data",
          secretDataType: "Text"
        }
      });
    }
  }
  
  // Return the default export and named exports
  return {
    __esModule: true, // Indicate this is an ES module
    default: Kms20160120,
    Kms20160120,
    GetSecretValueRequest,
    GetSecretValueResponse
  };
});
jest.mock("../utils/CredentialsProviderUtils");
jest.mock("../service/UserAgentManager");
jest.mock("../utils/PingUtils");
jest.mock("../utils/PrivateCaUtils");

describe("DefaultSecretManagerClientBuilder", () => {
  let builder: DefaultSecretManagerClientBuilder;

  beforeEach(() => {
    builder = new DefaultSecretManagerClientBuilder();
  });

  describe("withAccessKey", () => {
    it("should set provider with access key", () => {
      const result = builder.withAccessKey("accessKeyId", "accessKeySecret");
      expect(result).toBe(builder);
      // We can't directly check the internal provider property, but we can check the method chaining works
    });
  });

  describe("withCredentialsProvider", () => {
    it("should set the provider", () => {
      const mockProvider = {} as credentials.CredentialsProvider;
      const result = builder.withCredentialsProvider(mockProvider);
      expect(result).toBe(builder);
    });
  });

  describe("addRegion", () => {
    it("should add a region", () => {
      const result = builder.addRegion("cn-hangzhou");
      expect(result).toBe(builder);
    });
  });

  describe("addRegionInfo", () => {
    it("should add a region info", () => {
      const regionInfo = new RegionInfo("cn-hangzhou");
      const result = builder.addRegionInfo(regionInfo);
      expect(result).toBe(builder);
    });
  });

  describe("withRegion", () => {
    it("should add multiple regions", () => {
      const result = builder.withRegion("cn-hangzhou", "cn-beijing");
      expect(result).toBe(builder);
    });
  });

  describe("withBackoffStrategy", () => {
    it("should set the backoff strategy", () => {
      const mockBackoffStrategy = {} as BackoffStrategy;
      const result = builder.withBackoffStrategy(mockBackoffStrategy);
      expect(result).toBe(builder);
    });
  });

  describe("addConfig", () => {
    it("should throw error when config has no regionId", () => {
      const config = new Config();
      expect(() => {
        builder.addConfig(config);
      }).toThrow("regionId is required");
    });

    it("should add config with regionId", () => {
      const config = new Config();
      config.regionId = "cn-hangzhou";
      const result = builder.addConfig(config);
      expect(result).toBe(builder);
    });
  });

  describe("withCustomConfigFile", () => {
    it("should set custom config file", () => {
      const result = builder.withCustomConfigFile("/path/to/config");
      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build a DefaultSecretManagerClient", () => {
      const client = builder.build();
      expect(client).toBeInstanceOf(DefaultSecretManagerClient);
    });
  });
});

describe("DefaultSecretManagerClient", () => {
  let client: DefaultSecretManagerClient;

  beforeEach(() => {
    client = new DefaultSecretManagerClient([], {} as credentials.CredentialsProvider);
  });

  describe("init", () => {
    it("should initialize client", async () => {
      // We'll mock the required dependencies for init to work properly
      const regionInfo = new RegionInfo("cn-hangzhou");
      client = new DefaultSecretManagerClient([regionInfo], {} as credentials.CredentialsProvider);
      
      // Since we're mocking dependencies, init should not throw an error
      await expect(client.init()).resolves.not.toThrow();
    });

    it("should throw error when no regions are provided", async () => {
      await expect(client.init()).rejects.toThrow("The param[regionInfo] is needed");
    });

    it("should throw error when regionInfo has no regionId", async () => {
      const regionInfo = new RegionInfo("");
      client = new DefaultSecretManagerClient([regionInfo], {} as credentials.CredentialsProvider);
      
      await expect(client.init()).rejects.toThrow("The param[regionInfo.regionId] is needed");
    });
  });

  describe("getSecretValue", () => {
    it("should handle getSecretValue request and return response", async () => {
      const regionInfo = new RegionInfo("cn-hangzhou");
      client = new DefaultSecretManagerClient([regionInfo], {} as credentials.CredentialsProvider);
      
      // Initialize the client first
      await client.init();
      
      // Mock request
      const request = new GetSecretValueRequest({
        secretName: "test-secret"
      });

      // Call the method and verify the response
      const response = await client.getSecretValue(request);
      
      // Verify the response structure
      expect(response).toBeDefined();
      expect(response.body).toBeDefined();
      expect(response.body!.secretName).toBe("test-secret");
      expect(response.body!.versionId).toBe("v1");
      expect(response.body!.secretData).toBe("secret-data");
      expect(response.body!.secretDataType).toBe("Text");
    });
  });

  describe("close", () => {
    it("should close the client", () => {
      // Initialize client with a region to avoid init errors
      const regionInfo = new RegionInfo("cn-hangzhou");
      client = new DefaultSecretManagerClient([regionInfo], {} as credentials.CredentialsProvider);
      
      expect(() => {
        client.close();
      }).not.toThrow();
    });
  });

  describe("Integration tests for config loading", () => {
    it("should handle config from file", async () => {
      const regionInfo = new RegionInfo("cn-hangzhou");
      client = new DefaultSecretManagerClient(
        [regionInfo], 
        {} as credentials.CredentialsProvider,
        undefined,
        new Map(),
        "custom-config-path"
      );

      await expect(client.init()).resolves.not.toThrow();
    });

    it("should use default backoff strategy if none provided", async () => {
      const regionInfo = new RegionInfo("cn-hangzhou");
      client = new DefaultSecretManagerClient([regionInfo], {} as credentials.CredentialsProvider);

      await expect(client.init()).resolves.not.toThrow();
    });
  });
});