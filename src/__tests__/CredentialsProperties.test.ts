import { CredentialsProperties } from "../model/CredentialsProperties";
import { RegionInfo } from "../model/RegionInfo";

describe("CredentialsProperties", () => {
  test("should initialize with undefined properties by default", () => {
    const credentialsProperties = new CredentialsProperties();
    expect(credentialsProperties.provider).toBeUndefined();
    expect(credentialsProperties.regionInfoList).toBeUndefined();
    expect(credentialsProperties.sourceProperties).toBeUndefined();
  });

  test("should set and get provider property", () => {
    const credentialsProperties = new CredentialsProperties();
    const mockProvider = {} as any;

    credentialsProperties.provider = mockProvider;
    expect(credentialsProperties.provider).toBe(mockProvider);
  });

  test("should set and get regionInfoList property", () => {
    const credentialsProperties = new CredentialsProperties();
    const regionInfos = [
      new RegionInfo("cn-hangzhou"),
      new RegionInfo("cn-shanghai"),
    ];

    credentialsProperties.regionInfoList = regionInfos;
    expect(credentialsProperties.regionInfoList).toBe(regionInfos);
    expect(credentialsProperties.regionInfoList).toHaveLength(2);
    expect(credentialsProperties.regionInfoList![0].getRegionId()).toBe(
      "cn-hangzhou",
    );
    expect(credentialsProperties.regionInfoList![1].getRegionId()).toBe(
      "cn-shanghai",
    );
  });

  test("should set and get sourceProperties property", () => {
    const credentialsProperties = new CredentialsProperties();
    const properties = { key1: "value1", key2: "value2" };

    credentialsProperties.sourceProperties = properties;
    expect(credentialsProperties.sourceProperties).toBe(properties);
    expect(credentialsProperties.sourceProperties).toHaveProperty(
      "key1",
      "value1",
    );
    expect(credentialsProperties.sourceProperties).toHaveProperty(
      "key2",
      "value2",
    );
  });

  test("should handle null and undefined values", () => {
    const credentialsProperties = new CredentialsProperties();

    credentialsProperties.provider = undefined;
    credentialsProperties.regionInfoList = undefined;
    credentialsProperties.sourceProperties = undefined;

    expect(credentialsProperties.provider).toBeUndefined();
    expect(credentialsProperties.regionInfoList).toBeUndefined();
    expect(credentialsProperties.sourceProperties).toBeUndefined();
  });

  test("should maintain separate instances", () => {
    const credentialsProperties1 = new CredentialsProperties();
    const credentialsProperties2 = new CredentialsProperties();

    const provider1 = {} as any;
    const provider2 = {} as any;

    credentialsProperties1.provider = provider1;
    credentialsProperties2.provider = provider2;

    expect(credentialsProperties1.provider).toBe(provider1);
    expect(credentialsProperties2.provider).toBe(provider2);
    expect(credentialsProperties1.provider).not.toBe(
      credentialsProperties2.provider,
    );
  });

  test("should handle empty region info list", () => {
    const credentialsProperties = new CredentialsProperties();
    const emptyList: RegionInfo[] = [];

    credentialsProperties.regionInfoList = emptyList;
    expect(credentialsProperties.regionInfoList).toBe(emptyList);
    expect(credentialsProperties.regionInfoList).toHaveLength(0);
  });

  test("should handle empty source properties", () => {
    const credentialsProperties = new CredentialsProperties();
    const emptyProperties: Record<string, string> = {};

    credentialsProperties.sourceProperties = emptyProperties;
    expect(credentialsProperties.sourceProperties).toBe(emptyProperties);
    expect(Object.keys(credentialsProperties.sourceProperties!).length).toBe(0);
  });

  test("should update properties correctly", () => {
    const credentialsProperties = new CredentialsProperties();

    const initialProvider = {} as any;
    const initialRegions = [new RegionInfo("cn-beijing")];
    const initialProperties = { initial: "value" };

    credentialsProperties.provider = initialProvider;
    credentialsProperties.regionInfoList = initialRegions;
    credentialsProperties.sourceProperties = initialProperties;

    expect(credentialsProperties.provider).toBe(initialProvider);
    expect(credentialsProperties.regionInfoList).toBe(initialRegions);
    expect(credentialsProperties.sourceProperties).toBe(initialProperties);

    const updatedProvider = {} as any;
    const updatedRegions = [
      new RegionInfo("cn-shenzhen"),
      new RegionInfo("cn-qingdao"),
    ];
    const updatedProperties = { updated: "new_value", another: "property" };

    credentialsProperties.provider = updatedProvider;
    credentialsProperties.regionInfoList = updatedRegions;
    credentialsProperties.sourceProperties = updatedProperties;

    expect(credentialsProperties.provider).toBe(updatedProvider);
    expect(credentialsProperties.regionInfoList).toBe(updatedRegions);
    expect(credentialsProperties.sourceProperties).toBe(updatedProperties);
  });

  test("should handle various property values", () => {
    const credentialsProperties = new CredentialsProperties();

    const complexProperties = {
      "string.value": "stringValue",
      "number.value": "123",
      "boolean.value": "true",
      "special.chars": "!@#$%^&*()",
      "empty.value": "",
      "null.value": "null",
    };

    credentialsProperties.sourceProperties = complexProperties;
    expect(credentialsProperties.sourceProperties).toBe(complexProperties);

    for (const [key, value] of Object.entries(complexProperties)) {
      expect(credentialsProperties.sourceProperties![key]).toBe(value);
    }
  });

  test("should handle region info with additional properties", () => {
    const credentialsProperties = new CredentialsProperties();

    const regionWithEndpoint = new RegionInfo(
      "cn-hangzhou",
      "kms.cn-hangzhou.aliyuncs.com",
    );
    const regionWithAllParams = new RegionInfo(
      "cn-shanghai",
      "kms-vpc.cn-shanghai.aliyuncs.com",
      true,
      "/path/to/ca.pem",
    );

    credentialsProperties.regionInfoList = [
      regionWithEndpoint,
      regionWithAllParams,
    ];

    expect(credentialsProperties.regionInfoList).toHaveLength(2);
    expect(credentialsProperties.regionInfoList![0].getRegionId()).toBe(
      "cn-hangzhou",
    );
    expect(credentialsProperties.regionInfoList![0].getEndpoint()).toBe(
      "kms.cn-hangzhou.aliyuncs.com",
    );
    expect(credentialsProperties.regionInfoList![1].getRegionId()).toBe(
      "cn-shanghai",
    );
    expect(credentialsProperties.regionInfoList![1].getVpc()).toBe(true);
    expect(credentialsProperties.regionInfoList![1].getEndpoint()).toBe(
      "kms-vpc.cn-shanghai.aliyuncs.com",
    );
    expect(credentialsProperties.regionInfoList![1].getCaFilePath()).toBe(
      "/path/to/ca.pem",
    );
  });
});
