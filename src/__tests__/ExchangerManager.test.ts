import { describe, expect, test, jest } from "@jest/globals";
import {
  Config,
  ExchangerTypeKms,
  validateConfig,
} from "../mauth/exchanger/Config";
import {
  ExchangerManager,
  ExchangeResult,
} from "../mauth/exchanger/Exchanger";
import { KmsExchanger } from "../mauth/exchanger/KmsExchanger";

function makeConfig(overrides?: Partial<Config>): Config {
  const cfg = new Config();
  cfg.exchangerType = ExchangerTypeKms;
  cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";
  Object.assign(cfg, overrides);
  return cfg;
}

describe("exchanger validateConfig", () => {
  test("TestValidateConfig_Kms_Success", () => {
    expect(() => validateConfig(makeConfig())).not.toThrow();
  });

  test("TestValidateConfig_Kms_MissingEndpoint", () => {
    expect(() =>
      validateConfig(makeConfig({ kmsEndpoint: undefined })),
    ).toThrow("KmsEndpoint is required");
  });

  test("TestValidateConfig_Kms_DedicateEndpointWithoutCa", () => {
    expect(() =>
      validateConfig(
        makeConfig({ kmsEndpoint: "kst-xxx.cryptoservice.kms.aliyuncs.com" }),
      ),
    ).toThrow("use dedicate endpoint Ca is required");
  });

  test("TestValidateConfig_Kms_DedicateEndpointWithCa", () => {
    expect(() =>
      validateConfig(
        makeConfig({
          kmsEndpoint: "kst-xxx.cryptoservice.kms.aliyuncs.com",
          ca: "-----BEGIN CERTIFICATE-----",
        }),
      ),
    ).not.toThrow();
  });

  test("TestValidateConfig_UnsupportedType", () => {
    expect(() =>
      validateConfig(makeConfig({ exchangerType: "unknown" })),
    ).toThrow("unsupported exchanger type: unknown");
  });

  test("TestValidateConfig_EmptyType", () => {
    expect(() => validateConfig(new Config())).toThrow(
      "unsupported exchanger type: undefined",
    );
  });
});

describe("ExchangerManager", () => {
  test("TestExchangerManager_Kms_Success", () => {
    const manager = new ExchangerManager(
      makeConfig({ aapArn: "acs:ram::123:aap/x", ca: "ca-content" }),
    );
    const inner = (manager as any).exchanger;
    expect(inner).toBeInstanceOf(KmsExchanger);
    expect(inner.kmsEndpoint).toBe("kms.cn-hangzhou.aliyuncs.com");
    expect(inner.aapArn).toBe("acs:ram::123:aap/x");
    expect(inner.ca).toBe("ca-content");
  });

  test("TestExchangerManager_InvalidConfig", () => {
    expect(() => new ExchangerManager(makeConfig({ kmsEndpoint: "" }))).toThrow(
      "invalid config: KmsEndpoint is required",
    );
  });

  test("TestExchangerManager_UnsupportedType", () => {
    expect(() => new ExchangerManager(makeConfig({ exchangerType: "x" }))).toThrow(
      "invalid config: unsupported exchanger type: x",
    );
  });

  test("TestExchangerManager_ExchangeCredential_Delegates", async () => {
    const manager = new ExchangerManager(makeConfig());
    const result: ExchangeResult = {
      tokenType: "ClientKey",
      tokenValue: "v",
    };
    const exchangeCredential = jest.fn(async () => result);
    (manager as any).exchanger = { exchangeCredential };
    await expect(
      manager.exchangeCredential("jwt-token", "override-arn"),
    ).resolves.toBe(result);
    // 委托参数在调用返回后断言（假实现内部断言失败会被吞成 rejects）
    expect(exchangeCredential).toHaveBeenCalledWith("jwt-token", "override-arn");
  });
});
