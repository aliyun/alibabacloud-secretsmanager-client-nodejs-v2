import { describe, expect, test, beforeEach, afterEach, jest } from "@jest/globals";
import * as crypto from "crypto";

// 只 mock KMS 客户端（不触真实网络），模型类用真实实现
jest.mock("@alicloud/kms20160120", () => {
  const actual = jest.requireActual("@alicloud/kms20160120");
  return { __esModule: true, ...actual, default: jest.fn() };
});

import Kms20160120, { GetSecretValueRequest } from "@alicloud/kms20160120";
import { MAuth } from "../mauth/MAuth";
import { EndpointUtils } from "../mauth/utils/EndpointUtils";
import { RegionInfo } from "../model/RegionInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import {
  ActionGetSecretValue,
  AlgoRsaPkcs1Sha256,
  ApiVersion20160102,
  HeaderAccessKeyId,
  HeaderApiName,
  HeaderApiVersion,
  HeaderDate,
  HeaderSignatureMethod,
} from "../utils/Sign";
import { SecretManagerClientWithBearer } from "../service/SecretManagerClientBearer";
import { cleanupTempFiles, createTempFile } from "./helpers/tmp";

const KmsMock = Kms20160120 as unknown as jest.Mock;
const getSecretValueWithOptionsMock = jest.fn();

// 测试内自生成 RSA 私钥作为 tokenValue（签名用）
const { privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const getTokenMock = jest.fn();
const clearTokenMock = jest.fn();
const closeMock = jest.fn();

function makeClient(): SecretManagerClientWithBearer {
  const mauth = {
    getToken: getTokenMock,
    clearToken: clearTokenMock,
    close: closeMock,
  } as unknown as MAuth;
  return new SecretManagerClientWithBearer(mauth);
}

function makeToken(tokenValue: string = privateKey) {
  return {
    tokenType: "ClientKey",
    tokenKeyId: "kid-1",
    tokenValue,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  };
}

beforeEach(() => {
  KmsMock.mockReset();
  getSecretValueWithOptionsMock.mockReset();
  getTokenMock.mockReset();
  clearTokenMock.mockReset();
  closeMock.mockReset();
  KmsMock.mockImplementation(() => ({
    getSecretValueWithOptions: getSecretValueWithOptionsMock,
  }));
  getTokenMock.mockResolvedValue(makeToken());
});

afterEach(() => {
  cleanupTempFiles();
});

describe("resolveEndpoint", () => {
  test("TestResolveEndpoint_ExplicitEndpoint", () => {
    const regionInfo = new RegionInfo("cn-hangzhou", "my-endpoint.example.com");
    expect(EndpointUtils.resolveEndpoint(regionInfo)).toBe("my-endpoint.example.com");
  });

  test("TestResolveEndpoint_Vpc", () => {
    const regionInfo = new RegionInfo("cn-hangzhou", undefined, true);
    expect(EndpointUtils.resolveEndpoint(regionInfo)).toBe("kms-vpc.cn-hangzhou.aliyuncs.com");
  });

  test("TestResolveEndpoint_Public", () => {
    const regionInfo = new RegionInfo("cn-hangzhou");
    expect(EndpointUtils.resolveEndpoint(regionInfo)).toBe("kms.cn-hangzhou.aliyuncs.com");
  });
});

describe("resolveCa", () => {
  test("TestResolveCa_FromFile", () => {
    const caFile = createTempFile("ca_", "ca-file-content");
    const regionInfo = new RegionInfo(
      "cn-hangzhou",
      undefined,
      undefined,
      caFile,
    );
    expect(EndpointUtils.resolveCa(regionInfo)).toBe("ca-file-content");
  });

  test("TestResolveCa_BuiltIn", () => {
    const regionInfo = new RegionInfo("cn-hangzhou");
    const ca = EndpointUtils.resolveCa(regionInfo);
    // 内置 CA 应为 PEM 证书内容（不与实现内部 Map 自比较）
    expect(ca.length).toBeGreaterThan(0);
    expect(ca).toContain("-----BEGIN CERTIFICATE-----");
  });

  test("TestResolveCa_NotFound", () => {
    const regionInfo = new RegionInfo("region-without-builtin-ca");
    expect(() => EndpointUtils.resolveCa(regionInfo)).toThrow(
      /cannot find the built-in ca certificate/,
    );
  });
});

describe("resolveEndpointAndCa", () => {
  test("TestResolveEndpointAndCa_PublicEndpoint_NoCa", () => {
    const regionInfo = new RegionInfo("cn-hangzhou");
    expect(EndpointUtils.resolveEndpointAndCa(regionInfo)).toEqual({
      endpoint: "kms.cn-hangzhou.aliyuncs.com",
      ca: undefined,
    });
  });

  test("TestResolveEndpointAndCa_InstanceGateway_WithCa", () => {
    const caFile = createTempFile("ca_", "gw-ca-content");
    const regionInfo = new RegionInfo(
      "cn-hangzhou",
      `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
      undefined,
      caFile,
    );
    const result = EndpointUtils.resolveEndpointAndCa(regionInfo);
    expect(result.endpoint).toBe(
      `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
    );
    expect(result.ca).toBe("gw-ca-content");
  });
});

describe("SecretManagerClientWithBearer.getSecretValue", () => {
  test("TestGetSecretValue_Success", async () => {
    const expected = { body: { SecretData: "s3cr3t" } };
    getSecretValueWithOptionsMock.mockResolvedValue(expected);

    const client = makeClient();
    const req = new GetSecretValueRequest({ SecretName: "my-secret" });
    const resp = await client.getSecretValue(
      new RegionInfo("cn-hangzhou"),
      req,
    );

    expect(resp).toBe(expected);
    // 客户端配置：公网 endpoint、https、bearerToken 为签名值
    const config = KmsMock.mock.calls[0][0];
    expect(config.endpoint).toBe("kms.cn-hangzhou.aliyuncs.com");
    expect(config.protocol).toBe(CacheClientConstant.DEFAULT_PROTOCOL);
    expect(typeof config.bearerToken).toBe("string");
    expect(config.bearerToken.length).toBeGreaterThan(0);
    expect(config.ca).toBeUndefined();
    // 请求与运行时参数：签名 header 5 个键全断言
    const [calledReq, runtime] = getSecretValueWithOptionsMock.mock.calls[0];
    expect(calledReq).toBe(req);
    expect(runtime.extendsParameters.headers).toEqual(
      expect.objectContaining({
        [HeaderAccessKeyId]: "kid-1",
        [HeaderSignatureMethod]: AlgoRsaPkcs1Sha256,
        [HeaderApiName]: ActionGetSecretValue,
        [HeaderApiVersion]: ApiVersion20160102,
        [HeaderDate]: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
        ),
      }),
    );
  });

  test("TestGetSecretValue_InstanceGatewayCa", async () => {
    getSecretValueWithOptionsMock.mockResolvedValue({});
    const caFile = createTempFile("ca_", "gw-ca-content");
    const client = makeClient();
    await client.getSecretValue(
      new RegionInfo(
        "cn-hangzhou",
        `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
        undefined,
        caFile,
      ),
      new GetSecretValueRequest({ SecretName: "s" }),
    );
    const config = KmsMock.mock.calls[0][0];
    expect(config.ca).toBe("gw-ca-content");
  });

  test("TestGetSecretValue_RetryOnInvalidAccessKeyId", async () => {
    const err: any = new Error("token expired");
    err.code = CacheClientConstant.ERROR_CODE_INVALID_ACCESS_KEY_ID_NOT_FOUND;
    getSecretValueWithOptionsMock
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ body: "ok" });

    const client = makeClient();
    const resp = await client.getSecretValue(
      new RegionInfo("cn-hangzhou"),
      new GetSecretValueRequest({ SecretName: "s" }),
    );

    expect(resp).toEqual({ body: "ok" });
    expect(clearTokenMock).toHaveBeenCalledTimes(1);
    expect(getTokenMock).toHaveBeenCalledTimes(2);
  });

  test("TestGetSecretValue_OtherError_NoRetry", async () => {
    const err: any = new Error("server error");
    err.code = "InternalFailure";
    getSecretValueWithOptionsMock.mockRejectedValue(err);

    const client = makeClient();
    await expect(
      client.getSecretValue(
        new RegionInfo("cn-hangzhou"),
        new GetSecretValueRequest({ SecretName: "s" }),
      ),
    ).rejects.toThrow("server error");
    expect(clearTokenMock).not.toHaveBeenCalled();
  });

  test("TestGetSecretValue_GetTokenError", async () => {
    getTokenMock.mockRejectedValue(new Error("no token"));
    const client = makeClient();
    await expect(
      client.getSecretValue(
        new RegionInfo("cn-hangzhou"),
        new GetSecretValueRequest({ SecretName: "s" }),
      ),
    ).rejects.toThrow("get token error: no token");
  });

  test("TestGetSecretValue_SignError", async () => {
    getTokenMock.mockResolvedValue(makeToken("not-a-pem"));
    const client = makeClient();
    await expect(
      client.getSecretValue(
        new RegionInfo("cn-hangzhou"),
        new GetSecretValueRequest({ SecretName: "s" }),
      ),
    ).rejects.toThrow(/sign error/);
  });

  test("TestGetSecretValue_CreateClientError", async () => {
    KmsMock.mockImplementationOnce(() => {
      throw new Error("bad config");
    });
    const client = makeClient();
    await expect(
      client.getSecretValue(
        new RegionInfo("cn-hangzhou"),
        new GetSecretValueRequest({ SecretName: "s" }),
      ),
    ).rejects.toThrow("failed to create sm client: bad config");
  });
});

describe("SecretManagerClientWithBearer.close", () => {
  test("TestClose_Delegates", () => {
    const client = makeClient();
    client.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
