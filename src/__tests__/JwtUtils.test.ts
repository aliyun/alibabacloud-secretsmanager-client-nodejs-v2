import { describe, expect, test, afterEach } from "@jest/globals";
import { JwtUtils } from "../mauth/utils/JwtUtils";
import { cleanupTempFiles, createTempFile } from "./helpers/tmp";

afterEach(() => {
  cleanupTempFiles();
});

// base64url 编码（去掉 padding）
function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJWT(payload: any, header?: any): string {
  return `${b64url(header ?? { alg: "RS256", typ: "JWT" })}.${b64url(payload)}.c2ln`;
}

describe("JwtUtils.isValidJWT", () => {
  test("TestIsValidJWT_Valid", () => {
    expect(JwtUtils.isValidJWT(makeJWT({ sub: "s", exp: 123 }))).toBe(true);
  });

  test("TestIsValidJWT_UrlSafeChars", () => {
    // 构造包含 - _ 字符的 base64url 段（二进制内容）
    const raw = Buffer.from([0xfb, 0xef, 0xff, 0xfb, 0xef, 0xff]).toString(
      "base64url",
    );
    // header/payload 仍需为合法 JSON 对象
    const jwt = `${b64url({ alg: "RS256" })}.${b64url({ a: raw })}.sig`;
    expect(JwtUtils.isValidJWT(jwt)).toBe(true);
  });

  test("TestIsValidJWT_EncodedSegmentContainsUrlSafeChars", () => {
    // 回归用例：'~'(0x7E) / '?'(0x3F) 等字节编码后会产生 +//，
    // base64url 下即 -/_。校验若作用在已转成标准 base64 的串上，这类合法 JWT 会被误拒。
    const jwt = makeJWT({ sub: "~?~?" });
    expect(jwt.split(".")[1]).toMatch(/-/);
    expect(jwt.split(".")[1]).toMatch(/_/);
    expect(JwtUtils.isValidJWT(jwt)).toBe(true);
  });

  test("TestIsValidJWT_NotThreeParts", () => {
    expect(JwtUtils.isValidJWT("a.b")).toBe(false);
    expect(JwtUtils.isValidJWT("a.b.c.d")).toBe(false);
    expect(JwtUtils.isValidJWT("")).toBe(false);
  });

  test("TestIsValidJWT_PayloadNotJson", () => {
    const bad = Buffer.from("hello", "utf-8").toString("base64url");
    expect(JwtUtils.isValidJWT(`${b64url({ alg: "RS256" })}.${bad}.sig`)).toBe(
      false,
    );
  });

  test("TestIsValidJWT_PayloadNotObject", () => {
    // JSON 数组与字符串都不是对象
    const arr = Buffer.from("[1,2]", "utf-8").toString("base64url");
    expect(
      JwtUtils.isValidJWT(`${b64url({ alg: "RS256" })}.${arr}.sig`),
    ).toBe(false);
    const str = Buffer.from('"just-a-string"', "utf-8").toString("base64url");
    expect(
      JwtUtils.isValidJWT(`${b64url({ alg: "RS256" })}.${str}.sig`),
    ).toBe(false);
  });

  test("TestIsValidJWT_InvalidBase64UrlCharset", () => {
    // base64url 字符集之外的字符（!）应被拒绝
    expect(JwtUtils.isValidJWT(`${b64url({ alg: "RS256" })}.a!b.c`)).toBe(
      false,
    );
  });
});

describe("JwtUtils.parseJWTClaims", () => {
  test("TestParseJWTClaims_Valid", () => {
    const jwt = makeJWT({ sub: "subject", exp: 1700000000 });
    expect(JwtUtils.parseJWTClaims(jwt)).toEqual({
      sub: "subject",
      exp: 1700000000,
    });
  });

  test("TestParseJWTClaims_NotThreeParts", () => {
    expect(() => JwtUtils.parseJWTClaims("only.two")).toThrow(
      "invalid JWT format: not 3 parts",
    );
  });

  test("TestParseJWTClaims_PayloadNotJson", () => {
    const bad = Buffer.from("not-json", "utf-8").toString("base64url");
    expect(() =>
      JwtUtils.parseJWTClaims(`${b64url({ alg: "RS256" })}.${bad}.sig`),
    ).toThrow("failed to parse JWT claims");
  });
});

describe("JwtUtils.isValidJWTFile", () => {
  test("TestIsValidJWTFile_NotExist", () => {
    expect(JwtUtils.isValidJWTFile("/not/exist/token")).toBe(false);
  });

  test("TestIsValidJWTFile_InvalidContent", () => {
    const f = createTempFile("jwt_", "not-a-jwt");
    expect(JwtUtils.isValidJWTFile(f)).toBe(false);
  });

  test("TestIsValidJWTFile_ValidWithSurroundingSpace", () => {
    const f = createTempFile("jwt_", `  ${makeJWT({ sub: "s" })}\n`);
    expect(JwtUtils.isValidJWTFile(f)).toBe(true);
  });
});

describe("JwtUtils.getJWTExpiration", () => {
  test("TestGetJWTExpiration_NumberExp", () => {
    const jwt = makeJWT({ exp: 1700000000 });
    expect(JwtUtils.getJWTExpiration(jwt)).toEqual(new Date(1700000000 * 1000));
  });

  test("TestGetJWTExpiration_FloatExpTruncated", () => {
    const jwt = makeJWT({ exp: 1700000000.9 });
    expect(JwtUtils.getJWTExpiration(jwt)).toEqual(new Date(1700000000 * 1000));
  });

  test("TestGetJWTExpiration_StringExp", () => {
    const jwt = makeJWT({ exp: "1700000000" });
    expect(JwtUtils.getJWTExpiration(jwt)).toEqual(new Date(1700000000 * 1000));
  });

  test("TestGetJWTExpiration_MissingExp", () => {
    const jwt = makeJWT({ sub: "s" });
    expect(() => JwtUtils.getJWTExpiration(jwt)).toThrow(
      "JWT does not contain 'exp' claim",
    );
  });

  test("TestGetJWTExpiration_NonNumericExp", () => {
    const jwt = makeJWT({ exp: true });
    expect(() => JwtUtils.getJWTExpiration(jwt)).toThrow(
      "'exp' claim is not a number",
    );
    const jwt2 = makeJWT({ exp: "abc" });
    expect(() => JwtUtils.getJWTExpiration(jwt2)).toThrow(
      "'exp' claim is not a number",
    );
  });

  test("TestGetJWTExpiration_InvalidJwt", () => {
    expect(() => JwtUtils.getJWTExpiration("a.b")).toThrow(
      "invalid JWT format: not 3 parts",
    );
  });
});
