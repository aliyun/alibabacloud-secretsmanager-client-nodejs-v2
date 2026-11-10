import { describe, expect, test, afterEach } from "@jest/globals";
import { AckOidcAuthenticator } from "../mauth/authenticator/OidcAck";
import { IdentityTypeJWT } from "../mauth/authenticator/Config";
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

const VALID_JWT = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({ sub: "s", exp: 1700000000 })}.sig`;

describe("AckOidcAuthenticator.getIdentity", () => {
  test("TestGetIdentity_Success", async () => {
    // 文件内容带首尾空白，identityValue 应为 trim 后的 token
    const tokenFile = createTempFile("ack_token_", `  ${VALID_JWT}\n`);
    const identity = await new AckOidcAuthenticator(tokenFile).getIdentity();
    expect(identity.identityType).toBe(IdentityTypeJWT);
    expect(identity.identityValue).toBe(VALID_JWT);
    expect(identity.expiresAt).toBeUndefined();
  });

  test("TestGetIdentity_FileNotExist", async () => {
    await expect(
      new AckOidcAuthenticator("/not/exist/token").getIdentity(),
    ).rejects.toThrow(/failed to read token file/);
  });

  test("TestGetIdentity_InvalidJwtFormat", async () => {
    const tokenFile = createTempFile("ack_token_", "not-a-jwt");
    await expect(
      new AckOidcAuthenticator(tokenFile).getIdentity(),
    ).rejects.toThrow("invalid JWT format");
  });
});
