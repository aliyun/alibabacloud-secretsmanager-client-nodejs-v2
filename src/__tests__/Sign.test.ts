import { describe, expect, test, afterEach, jest } from "@jest/globals";
import * as crypto from "crypto";
import {
  ActionGetSecretValue,
  AlgoRsaPkcs1Sha256,
  ApiVersion20160102,
  HeaderAccessKeyId,
  HeaderApiName,
  HeaderApiVersion,
  HeaderDate,
  HeaderSignatureMethod,
  buildStringToSign,
  extractSignParams,
  percentEncode,
  sha256WithRsa,
  sign,
} from "../utils/Sign";
import { CommonLogger } from "../utils/CommonLogger";
import { CacheClientConstant } from "../utils/CacheClientConstant";

// 测试内自生成 RSA 密钥对（不触网、不依赖外部 fixture）
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

describe("percentEncode", () => {
  test("TestPercentEncode_Unreserved", () => {
    expect(percentEncode("abcXYZ019-_.~")).toBe("abcXYZ019-_.~");
  });

  test("TestPercentEncode_SpecialChars", () => {
    expect(percentEncode("a b")).toBe("a%20b");
    expect(percentEncode("*")).toBe("%2A");
    expect(percentEncode("!")).toBe("%21");
    expect(percentEncode("'")).toBe("%27");
    expect(percentEncode("(")).toBe("%28");
    expect(percentEncode(")")).toBe("%29");
    expect(percentEncode("=/&?")).toBe("%3D%2F%26%3F");
  });

  test("TestPercentEncode_NonAscii", () => {
    expect(percentEncode("中")).toBe("%E4%B8%AD");
  });

  test("TestPercentEncode_Empty", () => {
    expect(percentEncode("")).toBe("");
  });
});

describe("buildStringToSign", () => {
  test("TestBuildStringToSign_SortedAndEncoded", () => {
    const s = buildStringToSign({ b: "2", a: "1 2", c: "~" });
    expect(s).toBe("a=1%202&b=2&c=~");
  });

  test("TestBuildStringToSign_Empty", () => {
    expect(buildStringToSign({})).toBe("");
  });
});

describe("extractSignParams", () => {
  // 统一恢复 spy，避免断言失败时 console.error mock 泄漏到后续用例
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("TestExtractSignParams_PlainObject", () => {
    const { queryParams, header } = extractSignParams(
      { SecretName: "s", VersionId: "", NullField: null, Zero: 0 },
      "key-id-1",
      ActionGetSecretValue,
    );
    // 空串/null 被过滤，数字 0 保留（String(0) !== ""）
    expect(queryParams).toEqual({ SecretName: "s", Zero: "0" });
    expect(header[HeaderAccessKeyId]).toBe("key-id-1");
    expect(header[HeaderSignatureMethod]).toBe(AlgoRsaPkcs1Sha256);
    expect(header[HeaderApiName]).toBe(ActionGetSecretValue);
    expect(header[HeaderApiVersion]).toBe(ApiVersion20160102);
    // RFC3339 UTC 秒精度
    expect(header[HeaderDate]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test("TestExtractSignParams_TeaModelToMap", () => {
    const model = {
      secretName: "inner",
      toMap: () => ({ SecretName: "from-toMap" }),
    };
    const { queryParams } = extractSignParams(model, "k", ActionGetSecretValue);
    expect(queryParams).toEqual({ SecretName: "from-toMap" });
  });

  test("TestExtractSignParams_SerializeError", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    // 循环引用导致 JSON.stringify 抛错，走序列化失败分支
    const circular: any = {};
    circular.self = circular;
    const result = extractSignParams(circular, "k", ActionGetSecretValue);
    expect(result).toEqual({ queryParams: {}, header: {} });
    expect(errSpy).toHaveBeenCalledWith(
      "Error serializing JSON: %s",
      expect.any(Error),
    );
  });

  test("TestExtractSignParams_NullParam", () => {
    // param 为 null：序列化结果为 null，按空参数集合处理
    const { queryParams, header } = extractSignParams(
      null,
      "k",
      ActionGetSecretValue,
    );
    expect(queryParams).toEqual({});
    expect(header[HeaderAccessKeyId]).toBe("k");
  });

  test("TestExtractSignParams_RegisteredCommonLogger", () => {
    // 注册 CommonLogger 后，序列化错误走已注册 logger 而非 console。
    // 注意：CommonLogger.registerLogger 是进程级静态注册且无反注册 API，
    // 本用例之后的同文件用例都会走已注册 logger；本文件后续用例不依赖
    // console.error 路径，故不受影响（jest 模块隔离保证不跨文件泄漏）。
    const errors: any[][] = [];
    const fakeConsole = {
      error: (...args: any[]) => errors.push(args),
    } as unknown as Console;
    CommonLogger.registerLogger(
      CacheClientConstant.MODE_NAME,
      fakeConsole,
    );
    const circular: any = {};
    circular.self = circular;
    const result = extractSignParams(circular, "k", ActionGetSecretValue);
    expect(result).toEqual({ queryParams: {}, header: {} });
    expect(errors.length).toBe(1);
    expect(errors[0][0]).toContain("Error serializing JSON");
  });
});

describe("sha256WithRsa", () => {
  test("TestSha256WithRsa_InvalidPem", () => {
    expect(() => sha256WithRsa("source", "not-a-pem")).toThrow(
      "failed to decode PEM block",
    );
  });

  test("TestSha256WithRsa_BrokenPemBody", () => {
    const broken =
      "-----BEGIN PRIVATE KEY-----\nZm9vYmFy\n-----END PRIVATE KEY-----\n";
    expect(() => sha256WithRsa("source", broken)).toThrow(
      "failed to sign data",
    );
  });

  test("TestSha256WithRsa_SignAndVerify", () => {
    const source = "a=1&b=2";
    const signatureB64 = sha256WithRsa(source, privateKey);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(source, "utf8");
    expect(verifier.verify(publicKey, Buffer.from(signatureB64, "base64"))).toBe(
      true,
    );
  });
});

describe("sign", () => {
  test("TestSign_RoundTrip", () => {
    const queryParams = { SecretName: "s" };
    const header = { [HeaderAccessKeyId]: "kid", Date: "2026-01-01T00:00:00Z" };
    const signatureB64 = sign(queryParams, header, privateKey);

    const expectedString = buildStringToSign({ ...queryParams, ...header });
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(expectedString, "utf8");
    expect(
      verifier.verify(publicKey, Buffer.from(signatureB64, "base64")),
    ).toBe(true);
  });

  test("TestSign_HeaderOverridesQuery", () => {
    // 同名键时 header 覆盖 query
    const signatureB64 = sign({ k: "query" }, { k: "header" }, privateKey);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update("k=header", "utf8");
    expect(
      verifier.verify(publicKey, Buffer.from(signatureB64, "base64")),
    ).toBe(true);
  });
});
