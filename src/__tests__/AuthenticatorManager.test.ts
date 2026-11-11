import { describe, expect, test, afterEach } from "@jest/globals";
import {
  AuthenticatorManager,
  Identity,
} from "../mauth/authenticator/Authenticator";
import {
  Config,
  DefaultACKTokenPath,
} from "../mauth/authenticator/Config";
import { ACKOidcJwt, ECSInstanceIdentity } from "../mauth/config/Config";
import { AckOidcAuthenticator } from "../mauth/authenticator/OidcAck";
import { ECSAuthenticator } from "../mauth/authenticator/InstanceIdentityEcs";
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

describe("AuthenticatorManager", () => {
  test("TestAuthenticatorManager_AckOidc_DefaultTokenPath", () => {
    const cfg = new Config();
    cfg.authMethod = ACKOidcJwt;
    // tokenPath 未设置时不做文件校验，且回退默认路径
    const manager = new AuthenticatorManager(cfg);
    const inner = (manager as any).authenticator;
    expect(inner).toBeInstanceOf(AckOidcAuthenticator);
    expect(inner.tokenPath).toBe(DefaultACKTokenPath);
  });

  test("TestAuthenticatorManager_AckOidc_ExplicitTokenPath", () => {
    const tokenFile = createTempFile("ack_token_", VALID_JWT);
    const cfg = new Config();
    cfg.authMethod = ACKOidcJwt;
    cfg.tokenPath = tokenFile;
    const manager = new AuthenticatorManager(cfg);
    const inner = (manager as any).authenticator;
    expect(inner).toBeInstanceOf(AckOidcAuthenticator);
    expect(inner.tokenPath).toBe(tokenFile);
  });

  test("TestAuthenticatorManager_AckOidc_InvalidTokenFile", () => {
    const tokenFile = createTempFile("ack_token_", "not-a-jwt");
    const cfg = new Config();
    cfg.authMethod = ACKOidcJwt;
    cfg.tokenPath = tokenFile;
    expect(() => new AuthenticatorManager(cfg)).toThrow(
      /invalid config: token file does not exist or has invalid JWT format/,
    );
  });

  test("TestAuthenticatorManager_AckOidc_TokenFileNotExist", () => {
    const cfg = new Config();
    cfg.authMethod = ACKOidcJwt;
    cfg.tokenPath = "/not/exist/token";
    expect(() => new AuthenticatorManager(cfg)).toThrow(
      /invalid config: token file does not exist or has invalid JWT format/,
    );
  });

  test("TestAuthenticatorManager_Ecs", () => {
    const cfg = new Config();
    cfg.authMethod = ECSInstanceIdentity;
    const manager = new AuthenticatorManager(cfg);
    expect((manager as any).authenticator).toBeInstanceOf(ECSAuthenticator);
  });

  test("TestAuthenticatorManager_EmptyAuthMethod", () => {
    const cfg = new Config();
    expect(() => new AuthenticatorManager(cfg)).toThrow(
      /invalid config: unsupported authentication method/,
    );
  });

  test("TestAuthenticatorManager_UnsupportedAuthMethod", () => {
    const cfg = new Config();
    cfg.authMethod = "UnknownMethod";
    expect(() => new AuthenticatorManager(cfg)).toThrow(
      /invalid config: unsupported authentication method: UnknownMethod/,
    );
  });

  test("TestAuthenticatorManager_GetIdentity_Delegates", async () => {
    const cfg = new Config();
    cfg.authMethod = ECSInstanceIdentity;
    const manager = new AuthenticatorManager(cfg);

    const identity: Identity = {
      identityType: "PKCS7",
      identityValue: "v",
      expiresAt: new Date(),
    };
    (manager as any).authenticator = {
      getIdentity: async () => identity,
    };
    await expect(manager.getIdentity()).resolves.toBe(identity);
  });
});
