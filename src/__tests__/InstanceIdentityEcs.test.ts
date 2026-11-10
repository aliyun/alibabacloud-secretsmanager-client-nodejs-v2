import { describe, expect, test, beforeEach, jest } from "@jest/globals";

// 只 mock axios，不触真实网络（元数据地址 100.100.100.200 在测试环境不可达）
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

import axios from "axios";
import { ECSAuthenticator } from "../mauth/authenticator/InstanceIdentityEcs";
import { IdentityTypePKCS7 } from "../mauth/authenticator/Config";

const mockedAxios = axios as unknown as {
  get: jest.Mock;
  put: jest.Mock;
};

function mockPut(status: number, data: any, statusText = ""): void {
  mockedAxios.put.mockResolvedValue({ status, statusText, data });
}

function mockGet(status: number, data: any, statusText = ""): void {
  mockedAxios.get.mockResolvedValue({ status, statusText, data });
}

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.put.mockReset();
});

describe("ECSAuthenticator.getIdentity", () => {
  test("TestGetIdentity_Success", async () => {
    mockPut(200, "meta-token");
    mockGet(200, "  pkcs7-document  ");

    const identity = await new ECSAuthenticator().getIdentity();
    expect(identity.identityType).toBe(IdentityTypePKCS7);
    expect(JSON.parse(identity.identityValue)).toEqual({
      Document: "pkcs7-document",
    });

    // metadata token 请求参数
    expect(mockedAxios.put).toHaveBeenCalledWith(
      "http://100.100.100.200/latest/api/token",
      null,
      expect.objectContaining({
        headers: { "X-aliyun-ecs-metadata-token-ttl-seconds": "3600" },
        timeout: 2 * 1000,
        responseType: "text",
      }),
    );
    // put 选项中的透传/放行回调行为
    const putOpts = mockedAxios.put.mock.calls[0][2];
    expect(putOpts.transformResponse[0]("raw-token")).toBe("raw-token");
    expect(putOpts.validateStatus(500)).toBe(true);
    // pkcs7 请求带上 token 与 audience
    const [getUrl, getOpts] = mockedAxios.get.mock.calls[0];
    expect(getUrl).toMatch(
      /^http:\/\/100\.100\.100\.200\/latest\/dynamic\/instance-identity\/pkcs7\?audience=\d+$/,
    );
    expect(getOpts.headers).toEqual({
      "X-aliyun-ecs-metadata-token": "meta-token",
    });
    // get 选项中的透传/放行回调行为
    expect(getOpts.transformResponse[0]("raw-doc")).toBe("raw-doc");
    expect(getOpts.validateStatus(404)).toBe(true);
  });

  test("TestGetIdentity_NonStringData", async () => {
    // token 层：200 但 body 非字符串，抛错且指向 metadata token 层
    mockPut(200, { unexpected: true });
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      "failed to get metadata token: response body is not a string",
    );

    // pkcs7 层：200 但 body 非字符串，抛错且指向 metadata pkcs7 层
    mockPut(200, "meta-token");
    mockGet(200, 12345);
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      "failed to get metadata pkcs7: response body is not a string",
    );
  });

  test("TestGetIdentity_MetadataTokenRejected", async () => {
    mockedAxios.put.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata token/,
    );
  });

  test("TestGetIdentity_MetadataTokenNon200", async () => {
    mockPut(404, "", "Not Found");
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata token: .*404 Not Found/,
    );
  });

  test("TestGetIdentity_Pkcs7Rejected", async () => {
    mockPut(200, "meta-token");
    mockedAxios.get.mockRejectedValue(new Error("ETIMEDOUT"));
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata pkcs7/,
    );
  });

  test("TestGetIdentity_Pkcs7Non200", async () => {
    mockPut(200, "meta-token");
    mockGet(500, "", "Internal Server Error");
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata pkcs7: 500 Internal Server Error/,
    );
  });

  test("TestGetIdentity_Non200WithNonStringData_ReportsStatus", async () => {
    // 非 200 且 body 非字符串：状态码优先，不能被 "not a string" 顶掉
    mockPut(200, "meta-token");
    mockGet(500, { error: true }, "Internal Server Error");
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata pkcs7: 500 Internal Server Error/,
    );
  });

  test("TestGetIdentity_TokenNon200WithNonStringData_ReportsStatus", async () => {
    // token 层同样状态码优先
    mockPut(403, { error: true }, "Forbidden");
    await expect(new ECSAuthenticator().getIdentity()).rejects.toThrow(
      /failed to get metadata token: 403 Forbidden/,
    );
  });
});
