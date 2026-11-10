import { describe, expect, test, beforeAll } from "@jest/globals";
import * as forge from "node-forge";
import { extractClientKey } from "../mauth/utils/ClientKey";

const PASSWORD = "test-p12-password";

let p12Base64: string;
let notAfter: Date;
let noCertP12Base64: string;
let noKeyP12Base64: string;

function toBase64P12(p12Asn1: any): string {
  return forge.util.encode64(forge.asn1.toDer(p12Asn1).getBytes());
}

// 测试内自生成自签证书 + PKCS12（不触网、不依赖外部 fixture）
beforeAll(() => {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  cert.validity.notAfter = notAfter;
  const attrs = [{ name: "commonName", value: "client-key-test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  p12Base64 = toBase64P12(
    forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, PASSWORD),
  );
  // 缺 cert bag 的 p12（仅 key bag）
  noCertP12Base64 = toBase64P12(
    forge.pkcs12.toPkcs12Asn1(keys.privateKey, null, PASSWORD),
  );
  // 缺 key bag 的 p12（两个 cert bag，总数满足 >=2 但无私钥）
  noKeyP12Base64 = toBase64P12(
    forge.pkcs12.toPkcs12Asn1(null, [cert, cert], PASSWORD),
  );
});

describe("extractClientKey", () => {
  test("TestExtractClientKey_Success", () => {
    const result = extractClientKey(PASSWORD, p12Base64);
    expect(result.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
    // PKCS8 私钥可被再次解析且为 RSA 私钥（模数位数与生成的一致）
    const key = forge.pki.privateKeyFromPem(result.privateKeyPem);
    expect(key.n.bitLength()).toBe(1024);
    // 过期时间取证书 notAfter（秒精度）
    expect(result.expiresAt.getTime()).toBe(
      Math.floor(notAfter.getTime() / 1000) * 1000,
    );
  });

  test("TestExtractClientKey_WrongPassword", () => {
    expect(() => extractClientKey("wrong-password", p12Base64)).toThrow(
      "pkcs12 to pem error",
    );
  });

  test("TestExtractClientKey_InvalidDer", () => {
    const notP12 = forge.util.encode64("this-is-not-a-pkcs12");
    expect(() => extractClientKey(PASSWORD, notP12)).toThrow(
      "pkcs12 to pem error",
    );
  });

  test("TestExtractClientKey_EmptyData", () => {
    expect(() => extractClientKey(PASSWORD, "")).toThrow("pkcs12 to pem error");
  });

  test("TestExtractClientKey_NoCertBag", () => {
    expect(() => extractClientKey(PASSWORD, noCertP12Base64)).toThrow(
      "pkcs12 to pem error: blocks length less than 2",
    );
  });

  test("TestExtractClientKey_NoKeyBag", () => {
    expect(() => extractClientKey(PASSWORD, noKeyP12Base64)).toThrow(
      "pkcs12 to pem error: key block is missing",
    );
  });
});
