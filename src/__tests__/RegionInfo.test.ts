import { RegionInfo } from "../model/RegionInfo";
import { describe, expect, test } from "@jest/globals";

describe("RegionInfo", () => {
  test("should construct with no arguments (regionId defaults to empty string)", () => {
    // README FAQ 用法：无参构造 + setter 补值
    const regionInfo = new RegionInfo();
    expect(regionInfo.getRegionId()).toBe("");
    expect(regionInfo.getEndpoint()).toBeUndefined();
    expect(regionInfo.getVpc()).toBeUndefined();
    expect(regionInfo.getCaFilePath()).toBeUndefined();
  });

  test("should populate fields via setters after no-arg construction", () => {
    const regionInfo = new RegionInfo();
    regionInfo.setRegionId("cn-hangzhou");
    regionInfo.setEndpoint("kst-test.cryptoservice.kms.aliyuncs.com");
    regionInfo.setCaFilePath("/path/to/ca.pem");
    regionInfo.setVpc(true);

    expect(regionInfo.getRegionId()).toBe("cn-hangzhou");
    expect(regionInfo.getEndpoint()).toBe(
      "kst-test.cryptoservice.kms.aliyuncs.com",
    );
    expect(regionInfo.getCaFilePath()).toBe("/path/to/ca.pem");
    expect(regionInfo.getVpc()).toBe(true);
  });

  test("no-arg construction should equal explicit empty regionId", () => {
    expect(new RegionInfo().getRegionId()).toBe(
      new RegionInfo("").getRegionId(),
    );
  });

  test("should construct with full parameters", () => {
    const regionInfo = new RegionInfo(
      "cn-hangzhou",
      "kst-test.cryptoservice.kms.aliyuncs.com",
      true,
      "/path/to/ca.pem",
    );
    expect(regionInfo.getRegionId()).toBe("cn-hangzhou");
    expect(regionInfo.getEndpoint()).toBe(
      "kst-test.cryptoservice.kms.aliyuncs.com",
    );
    expect(regionInfo.getVpc()).toBe(true);
    expect(regionInfo.getCaFilePath()).toBe("/path/to/ca.pem");
  });
});
