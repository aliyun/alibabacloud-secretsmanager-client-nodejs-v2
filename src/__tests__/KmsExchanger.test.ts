import { describe, expect, test, beforeEach, jest } from "@jest/globals";

// 只 mock OpenApi 客户端（不触真实网络），$OpenApiUtil/$dara 用真实实现
jest.mock("@alicloud/openapi-core", () => {
  const actual = jest.requireActual("@alicloud/openapi-core");
  return { __esModule: true, ...actual, default: jest.fn() };
});

import OpenApi from "@alicloud/openapi-core";
import {
  ActionIssueTemporaryCredential,
  KmsExchanger,
  AapArnQueryKey,
} from "../mauth/exchanger/KmsExchanger";

const OpenApiMock = OpenApi as unknown as jest.Mock;
const callApiMock = jest.fn();

beforeEach(() => {
  OpenApiMock.mockReset();
  callApiMock.mockReset();
  OpenApiMock.mockImplementation(() => ({ callApi: callApiMock }));
});

describe("KmsExchanger.exchangeCredential", () => {
  test("TestExchangeCredential_Success", async () => {
    callApiMock.mockResolvedValue({
      body: {
        CredentialType: "ClientKey",
        Credential: '{"ClientKeyId":"kid"}',
        RequestId: "req-1",
      },
    });

    const exchanger = new KmsExchanger(
      "kms.cn-hangzhou.aliyuncs.com",
      "acs:ram::123:aap/default",
    );
    const result = await exchanger.exchangeCredential("jwt-token");

    expect(result).toEqual({
      tokenType: "ClientKey",
      tokenValue: '{"ClientKeyId":"kid"}',
    });

    // 客户端配置
    const config = OpenApiMock.mock.calls[0][0];
    expect(config.endpoint).toBe("kms.cn-hangzhou.aliyuncs.com");
    expect(config.bearerToken).toBe("jwt-token");
    expect(config.protocol).toBe("https");
    expect(config.ca).toBeUndefined();

    // 请求参数：action/version/query/headers
    const [params, request] = callApiMock.mock.calls[0];
    expect(params.action).toBe(ActionIssueTemporaryCredential);
    expect(params.version).toBe("2016-01-20");
    expect(params.authType).toBe("bearer");
    expect(request.query[AapArnQueryKey]).toBe("acs:ram::123:aap/default");
    expect(request.headers["X-Acs-Bearer-Token"]).toBe("jwt-token");
  });

  test("TestExchangeCredential_AapArnOverride", async () => {
    callApiMock.mockResolvedValue({
      body: { CredentialType: "ClientKey", Credential: "c" },
    });
    const exchanger = new KmsExchanger(
      "kms.cn-hangzhou.aliyuncs.com",
      "default-arn",
    );
    await exchanger.exchangeCredential("jwt", "override-arn");
    const [, request] = callApiMock.mock.calls[0];
    expect(request.query[AapArnQueryKey]).toBe("override-arn");
  });

  test("TestExchangeCredential_NoAapArn", async () => {
    callApiMock.mockResolvedValue({
      body: { CredentialType: "ClientKey", Credential: "c" },
    });
    const exchanger = new KmsExchanger("kms.cn-hangzhou.aliyuncs.com");
    await exchanger.exchangeCredential("jwt");
    const [, request] = callApiMock.mock.calls[0];
    expect(request.query[AapArnQueryKey]).toBe("");
  });

  test("TestExchangeCredential_WithCa", async () => {
    callApiMock.mockResolvedValue({
      body: { CredentialType: "ClientKey", Credential: "c" },
    });
    const exchanger = new KmsExchanger(
      "kst-xxx.cryptoservice.kms.aliyuncs.com",
      "arn",
      "ca-content",
    );
    await exchanger.exchangeCredential("jwt");
    const config = OpenApiMock.mock.calls[0][0];
    expect(config.ca).toBe("ca-content");
  });

  test("TestExchangeCredential_MissingCredentialFields", async () => {
    // body 缺 CredentialType/Credential 时回退空串
    callApiMock.mockResolvedValue({ body: { RequestId: "req-2" } });
    const exchanger = new KmsExchanger("kms.cn-hangzhou.aliyuncs.com");
    const result = await exchanger.exchangeCredential("jwt");
    expect(result).toEqual({ tokenType: "", tokenValue: "" });
  });

  test("TestExchangeCredential_CreateClientError", async () => {
    OpenApiMock.mockImplementationOnce(() => {
      throw new Error("invalid endpoint");
    });
    const exchanger = new KmsExchanger("kms.cn-hangzhou.aliyuncs.com");
    await expect(exchanger.exchangeCredential("jwt")).rejects.toThrow(
      "failed to create client: invalid endpoint",
    );
  });

  test("TestExchangeCredential_CallApiError", async () => {
    callApiMock.mockRejectedValue(new Error("Forbidden.NoPermission"));
    const exchanger = new KmsExchanger("kms.cn-hangzhou.aliyuncs.com");
    await expect(exchanger.exchangeCredential("jwt")).rejects.toThrow(
      "failed to call api: Forbidden.NoPermission",
    );
  });

  test("TestExchangeCredential_MissingBody", async () => {
    // body 缺失时按空对象处理，回退空串
    callApiMock.mockResolvedValue({ statusCode: 200 });
    const exchanger = new KmsExchanger("kms.cn-hangzhou.aliyuncs.com");
    const result = await exchanger.exchangeCredential("jwt");
    expect(result).toEqual({ tokenType: "", tokenValue: "" });
  });
});
