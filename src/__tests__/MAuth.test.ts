import {
  describe,
  expect,
  test,
  afterEach,
  beforeAll,
  jest,
} from "@jest/globals";
import * as fs from "fs";
import * as forge from "node-forge";
import {
  AuthTokenTypeClientKey,
  MAuth,
  REFRESH_INTERVAL_MILLIS,
} from "../mauth/MAuth";
import { AuthenticatorManager } from "../mauth/authenticator/Authenticator";
import { ExchangerManager } from "../mauth/exchanger/Exchanger";
import { Wrapper } from "../mauth/logger/Logger";
import { AuthConfig, ClientKey } from "../mauth/config/Config";
import { ACKOidcJwt, ECSInstanceIdentity } from "../mauth/config/Config";
import { RegionInfo } from "../model/RegionInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { cleanupTempFiles, createTempFile } from "./helpers/tmp";

afterEach(() => {
  cleanupTempFiles();
});

describe("MAuth", () => {
  test("TestNewMAuth_ClientKey_Success", () => {
    const tmpConfigFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);
    expect(m).toBeDefined();
    expect((m as any).config.authMethod).toBe(ClientKey);
  });

  test("TestNewMAuth_ACKOidcJwt_Success", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ACKOidcJwt;
    cfg.aapArn = "arn:test:aap";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);
    expect(m).toBeDefined();
    m.close();
  });

  test("TestNewMAuth_ECSInstanceIdentity_Success", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ECSInstanceIdentity;
    cfg.aapArn = "arn:test:aap";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);
    expect(m).toBeDefined();
    m.close();
  });

  test("TestNewMAuth_InvalidAuthMethod", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = "InvalidMethod";
    // kmsEndpoint 校验先于 authMethod switch，需补齐以命中 unsupported 分支
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => new MAuth(cfg)).toThrow(
      /invalid config: unsupported authentication method: InvalidMethod/,
    );
  });

  test("TestNewMAuth_EmptyAuthMethod", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = "";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => new MAuth(cfg)).toThrow(
      /invalid config: AuthMethod is required/,
    );
  });

  test("TestMAuth_GetToken_CacheHit", async () => {
    const tmpConfigFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);

    // 手动设置缓存 token，过期时间大于 48 小时
    (m as any).cacheToken = new Map<string, any>([
      [
        "ClientKey",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "test-key-id",
          tokenValue: "test-token-value",
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      ],
    ]);

    const token = await m.getToken();
    expect(token).toBeDefined();
    expect(token.tokenKeyId).toBe("test-key-id");
    expect(token.tokenValue).toBe("test-token-value");
  });

  test("TestMAuth_ClearToken", async () => {
    const tmpConfigFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);

    (m as any).cacheToken = new Map<string, any>([
      [
        "ClientKey",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "test-key-id",
          tokenValue: "test-token-value",
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      ],
    ]);

    m.clearToken();
    expect((m as any).cacheToken.size).toBe(0);
  });

  test("TestMAuth_getClientKeyByLocalFile_ConfigFileNotExist", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = "/not/exist/config.json";
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => new MAuth(cfg)).toThrow(
      "client key config file does not exist",
    );
  });

  test("TestMAuth_getClientKeyByLocalFile_InvalidConfigFormat", async () => {
    const tmpConfigFile = createTempFile("client_key_config_", "invalid json");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg);

    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      "failed to parse client key config",
    );
  });

  test("TestMAuth_getClientKeyByLocalFile_PasswordFileNotExist", () => {
    const tmpConfigFile = createTempFile(
      "client_key_config_",
      `{"KeyId":"test","PrivateKeyData":"test"}`,
    );

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPasswordPath = "/not/exist/password.txt";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => new MAuth(cfg)).toThrow(
      "client key password file does not exist",
    );
  });

  test("TestMAuth_getClientKeyByLocalFile_MissingPassword", () => {
    const tmpConfigFile = createTempFile(
      "client_key_config_",
      `{"KeyId":"test","PrivateKeyData":"test"}`,
    );

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => new MAuth(cfg)).toThrow(
      "ClientKeyPassword or ClientKeyPasswordPath is required",
    );
  });
});

describe("MAuth.fromRegion", () => {
  test("TestFromRegion_FillsEndpointAndCa", () => {
    const caFile = createTempFile("ca_", "gw-ca-content");
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = createTempFile("client_key_config_");
    cfg.clientKeyPassword = "test_password";

    const regionInfo = new RegionInfo(
      "cn-hangzhou",
      `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
      undefined,
      caFile,
    );
    const m = MAuth.fromRegion(cfg, regionInfo);
    const resolved = (m as any).config;
    expect(resolved.kmsEndpoint).toBe(
      `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
    );
    expect(resolved.ca).toBe("gw-ca-content");
    // 入参不被改写：调用方可复用同一份 AuthConfig
    expect(cfg.kmsEndpoint).toBeUndefined();
    expect(cfg.ca).toBeUndefined();
    m.close();
  });

  test("TestFromRegion_ExplicitEndpointNotOverridden", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = createTempFile("client_key_config_");
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "my-kms.example.com";

    // 未配置内置 CA 的地域也不影响：endpoint 已显式给出，不做推导
    const m = MAuth.fromRegion(
      cfg,
      new RegionInfo("region-without-builtin-ca"),
    );
    expect((m as any).config.kmsEndpoint).toBe("my-kms.example.com");
    m.close();
  });

  test("TestFromRegion_ResolveFailureWrapped", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = createTempFile("client_key_config_");
    cfg.clientKeyPassword = "test_password";

    const regionInfo = new RegionInfo(
      "region-without-builtin-ca",
      `kst-xxx.${CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX}`,
    );
    expect(() => MAuth.fromRegion(cfg, regionInfo)).toThrow(
      /failed to resolve endpoint and ca for region\[region-without-builtin-ca\]: cannot find the built-in ca certificate/,
    );
  });
});

// ------- 编排增量测试：构造装配 / 远程置换 / 本地 ClientKey / 刷新 / 定时器 -------

const P12_PASSWORD = "test-p12-password";
let p12Base64: string;
let p12NotAfter: Date;

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const VALID_JWT = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({ sub: "s", exp: 1700000000 })}.sig`;

function mockLogger(): Wrapper & Record<string, jest.Mock> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
}

function makeAckCfg(
  tokenFile?: string,
  aapArn: string = "acs:ram::123:aap/x",
): AuthConfig {
  const cfg = new AuthConfig();
  cfg.authMethod = ACKOidcJwt;
  cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";
  cfg.aapArn = aapArn;
  if (tokenFile !== undefined) {
    cfg.tokenPath = tokenFile;
  }
  return cfg;
}

// 注入 mock 认证器/置换器，隔离网络
function injectRemote(
  m: MAuth,
  identityImpl: () => Promise<any>,
  exchangeImpl: () => Promise<any>,
): void {
  (m as any).authenticator = { getIdentity: identityImpl };
  (m as any).exchanger = { exchangeCredential: exchangeImpl };
}

describe("MAuth orchestration", () => {
  beforeAll(() => {
    // 测试内自生成自签证书 + PKCS12（不触网、不依赖外部 fixture）
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    p12NotAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    cert.validity.notAfter = p12NotAfter;
    const attrs = [{ name: "commonName", value: "mauth-test" }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
      keys.privateKey,
      cert,
      P12_PASSWORD,
    );
    p12Base64 = forge.util.encode64(forge.asn1.toDer(p12Asn1).getBytes());
  });

  test("TestMAuth_Constructor_FullAssembly", () => {
    const tokenFile = createTempFile("ack_token_", VALID_JWT);
    const m = new MAuth(makeAckCfg(tokenFile, "acs:ram::123:aap/x"));
    expect((m as any).authenticator).toBeInstanceOf(AuthenticatorManager);
    expect((m as any).exchanger).toBeInstanceOf(ExchangerManager);
    expect((m as any).refreshTimer).toBeDefined();
    m.close();
    expect((m as any).refreshTimer).toBeUndefined();
    // 重复 close 幂等
    m.close();
  });

  test("TestMAuth_Constructor_AuthenticatorManagerError", () => {
    const badTokenFile = createTempFile("ack_token_", "not-a-jwt");
    expect(() => new MAuth(makeAckCfg(badTokenFile))).toThrow(
      /failed to create authenticator manager: invalid config/,
    );
  });

  test("TestMAuth_Constructor_ExchangerError", () => {
    const tokenFile = createTempFile("ack_token_", VALID_JWT);
    const cfg = makeAckCfg(tokenFile);
    // 专属网关 endpoint 必须配 ca，触发置换器装配失败
    cfg.kmsEndpoint = "kst-xxx.cryptoservice.kms.aliyuncs.com";
    expect(() => new MAuth(cfg)).toThrow(
      /failed to create exchanger: invalid config: use dedicate endpoint Ca is required/,
    );
  });

  test("TestMAuth_GetTokenFromRemote_Success", async () => {
    const m = new MAuth(makeAckCfg(undefined, "acs:ram::123:aap/x"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt-token" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: JSON.stringify({
          ClientKeyId: "remote-kid",
          Password: P12_PASSWORD,
          PrivateKeyData: p12Base64,
        }),
      }),
    );
    const token = await m.getToken();
    expect(token.tokenType).toBe(AuthTokenTypeClientKey);
    expect(token.tokenKeyId).toBe("remote-kid");
    expect(token.tokenValue).toContain("-----BEGIN PRIVATE KEY-----");
    expect(token.expiresAt.getTime()).toBe(
      Math.floor(p12NotAfter.getTime() / 1000) * 1000,
    );
    // 成功后写入缓存
    expect((m as any).cacheToken.get("acs:ram::123:aap/x")).toBe(token);
    m.close();
  });

  test("TestMAuth_GetToken_CacheMapReused_OtherArnSurvives", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn-a"), mockLogger());
    // 预置另一个 ARN 的过期缓存：cacheToken 已存在，覆盖 if (!this.cacheToken) 的 false 分支
    const otherToken = {
      tokenType: AuthTokenTypeClientKey,
      tokenKeyId: "other-kid",
      tokenValue: "other-v",
      expiresAt: new Date(Date.now() - 1000),
    };
    const cache = new Map<string, any>([["arn-b", otherToken]]);
    (m as any).cacheToken = cache;

    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: JSON.stringify({
          ClientKeyId: "kid-a",
          Password: P12_PASSWORD,
          PrivateKeyData: p12Base64,
        }),
      }),
    );

    const token = await m.getToken("arn-a");
    expect(token.tokenKeyId).toBe("kid-a");
    // Map 实例被复用而非重建，其他 ARN 的缓存不能丢
    expect((m as any).cacheToken).toBe(cache);
    expect(cache.get("arn-b")).toBe(otherToken);
    expect(cache.size).toBe(2);
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_AapArnOverride", async () => {
    const m = new MAuth(makeAckCfg(undefined, "config-arn"), mockLogger());
    const exchange = jest.fn(async () => ({
      tokenType: AuthTokenTypeClientKey,
      tokenValue: JSON.stringify({
        ClientKeyId: "kid",
        Password: P12_PASSWORD,
        PrivateKeyData: p12Base64,
      }),
    }));
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      exchange as any,
    );
    await m.getToken("override-arn");
    // 覆盖值透传给置换器
    expect(exchange).toHaveBeenCalledWith("jwt", "override-arn");
    // 缓存键使用覆盖值而非配置值
    expect((m as any).cacheToken.has("override-arn")).toBe(true);
    expect((m as any).cacheToken.has("config-arn")).toBe(false);
    expect((m as any).cacheToken.size).toBe(1);
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_IdentityError", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => {
        throw new Error("metadata unavailable");
      },
      async () => ({ tokenType: "", tokenValue: "" }),
    );
    await expect(m.getToken()).rejects.toThrow(
      "failed to get identity: metadata unavailable",
    );
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_ExchangeError", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => {
        throw new Error("Forbidden");
      },
    );
    await expect(m.getToken()).rejects.toThrow(
      "failed to exchange credential: Forbidden",
    );
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_InvalidTokenType", async () => {
    const m = new MAuth(makeAckCfg(), mockLogger());
    // 构造后置空 config.aapArn，覆盖 ?? "" 回退分支（构造期已校验，正常路径不可达）
    (m as any).config.aapArn = undefined;
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({ tokenType: "Bearer", tokenValue: "{}" }),
    );
    await expect(m.getToken()).rejects.toThrow("invalid token type: Bearer");
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_InvalidTokenValueJson", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: "not-json",
      }),
    );
    await expect(m.getToken()).rejects.toThrow(
      "failed to parse client key credential",
    );
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_CredentialMissingP12Fields", async () => {
    // 远程凭据既无 Password 也无 PrivateKeyData：两个 ?? "" 回退同时命中
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: JSON.stringify({ ClientKeyId: "kid-only" }),
      }),
    );
    // getToken 外层还会包一层 "failed to get new token and no valid cached
    // token available: "，故不锚定行首
    await expect(m.getToken()).rejects.toThrow(
      /failed to decrypt client key: pkcs12 to pem error/,
    );
    m.close();
  });

  test("TestMAuth_GetTokenFromRemote_ExtractClientKeyError", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: JSON.stringify({
          ClientKeyId: "kid",
          Password: "pw",
          PrivateKeyData: forge.util.encode64("not-a-p12"),
        }),
      }),
    );
    await expect(m.getToken()).rejects.toThrow(
      /failed to decrypt client key/,
    );
    m.close();
  });

  test("TestMAuth_GetToken_FallbackToUnexpiredCache", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
    const cached = {
      tokenType: AuthTokenTypeClientKey,
      tokenKeyId: "cached-kid",
      tokenValue: "cached-value",
      // 剩余 1 小时：小于 48 小时阈值触发远程获取，但本身未过期可兜底
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
    (m as any).cacheToken = new Map([["arn", cached]]);
    injectRemote(
      m,
      async () => {
        throw new Error("network down");
      },
      async () => ({ tokenType: "", tokenValue: "" }),
    );
    const token = await m.getToken();
    expect(token).toBe(cached);
    expect(lw.warn).toHaveBeenCalledWith(
      "Using cached token for AAP ARN %s, expires at %s",
      "arn",
      cached.expiresAt,
    );
    m.close();
  });

  test("TestMAuth_GetToken_NoFallbackWhenCacheExpired", async () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    (m as any).cacheToken = new Map([
      [
        "arn",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "kid",
          tokenValue: "v",
          expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      ],
    ]);
    injectRemote(
      m,
      async () => {
        throw new Error("network down");
      },
      async () => ({ tokenType: "", tokenValue: "" }),
    );
    await expect(m.getToken()).rejects.toThrow(
      /failed to get new token and no valid cached token available: failed to get identity: network down/,
    );
    m.close();
  });

  test("TestMAuth_GetClientKeyByLocalFile_Success_WithPassword", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    const token = await m.getToken();
    expect(token.tokenType).toBe(AuthTokenTypeClientKey);
    expect(token.tokenKeyId).toBe("local-kid");
    expect(token.tokenValue).toContain("-----BEGIN PRIVATE KEY-----");
    expect((m as any).cacheToken.get("ClientKey")).toBe(token);
  });

  test("TestMAuth_GetClientKeyByLocalFile_Success_WithPasswordFile", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    // 密码文件带首尾空白，读取后应 trim
    const passwordFile = createTempFile("client_key_pw_", `  ${P12_PASSWORD}\n`);
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPasswordPath = passwordFile;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    const token = await m.getToken();
    expect(token.tokenKeyId).toBe("local-kid");
    expect(token.tokenValue).toContain("-----BEGIN PRIVATE KEY-----");
  });

  test("TestMAuth_GetClientKeyByLocalFile_ConfigFileDeletedAfterInit", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    // 构造校验通过后文件被删除，读取失败分支
    fs.rmSync(configFile);
    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      /failed to read client key config file/,
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_PasswordFileDeletedAfterInit", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    const passwordFile = createTempFile("client_key_pw_", P12_PASSWORD);
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPasswordPath = passwordFile;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    // 构造校验通过后密码文件被删除，读取失败分支
    fs.rmSync(passwordFile);
    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      /failed to read client key password file/,
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_DecryptError", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({
        KeyId: "local-kid",
        PrivateKeyData: forge.util.encode64("not-a-p12"),
      }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    await expect(m.getToken()).rejects.toThrow(
      /failed to decrypt client key/,
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_ConfigMissingPrivateKeyData", async () => {
    // 本地配置只有 KeyId、无 PrivateKeyData：cc.PrivateKeyData ?? "" 回退分支
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid" }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    // ClientKey 认证不建定时器，无需 close
    const m = new MAuth(cfg, mockLogger());
    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      /^failed to decrypt client key: pkcs12 to pem error/,
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_ConfigPathClearedAfterInit", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    // 构造期已校验，正常路径不可达；构造后置空以覆盖兜底分支
    (m as any).config.clientKeyConfigPath = "";
    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      "client key config path is not set",
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_PasswordClearedAfterInit", async () => {
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ KeyId: "local-kid", PrivateKeyData: p12Base64 }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    // 构造期已校验，正常路径不可达；构造后清空密码以覆盖兜底分支
    (m as any).config.clientKeyPassword = "";
    await expect((m as any).getClientKeyByLocalFile()).rejects.toThrow(
      "client key password or password path is not set",
    );
  });

  test("TestMAuth_GetClientKeyByLocalFile_MissingKeyId_FallbackEmpty", async () => {
    // JSON 只含 PrivateKeyData：KeyId ?? "" 回退分支
    const configFile = createTempFile(
      "client_key_config_",
      JSON.stringify({ PrivateKeyData: p12Base64 }),
    );
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = configFile;
    cfg.clientKeyPassword = P12_PASSWORD;
    cfg.kmsEndpoint = "kms.cn-hangzhou.aliyuncs.com";

    const m = new MAuth(cfg, mockLogger());
    const token = await m.getToken();
    expect(token.tokenKeyId).toBe("");
    expect(token.tokenValue).toContain("-----BEGIN PRIVATE KEY-----");
  });

  test("TestMAuth_GetTokenFromRemote_MissingClientKeyId_FallbackEmpty", async () => {
    // 远程凭据 JSON 只含 Password/PrivateKeyData：ClientKeyId ?? "" 回退分支
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    injectRemote(
      m,
      async () => ({ identityType: "JWT", identityValue: "jwt" }),
      async () => ({
        tokenType: AuthTokenTypeClientKey,
        tokenValue: JSON.stringify({
          Password: P12_PASSWORD,
          PrivateKeyData: p12Base64,
        }),
      }),
    );
    const token = await m.getToken();
    expect(token.tokenKeyId).toBe("");
    expect(token.tokenValue).toContain("-----BEGIN PRIVATE KEY-----");
    m.close();
  });

  test("TestMAuth_RefreshToken_NilCache", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(), lw);
    await m.refreshToken();
    expect(lw.info).toHaveBeenCalledWith("cacheToken is undefined");
    m.close();
  });

  test("TestMAuth_RefreshToken_EmptyCache", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(), lw);
    (m as any).cacheToken = new Map();
    await m.refreshToken();
    expect(lw.info).toHaveBeenCalledWith("cacheToken is empty");
    m.close();
  });

  test("TestMAuth_RefreshToken_FreshTokenNotRefreshed", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
    (m as any).cacheToken = new Map([
      [
        "arn",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "kid",
          tokenValue: "v",
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      ],
    ]);
    const spy = jest.spyOn(m, "getToken");
    await m.refreshToken();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    m.close();
  });

  test("TestMAuth_RefreshToken_Success", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
    (m as any).cacheToken = new Map([
      [
        "arn",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "kid",
          tokenValue: "v",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    ]);
    const freshExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const spy = jest
      .spyOn(m, "getToken")
      .mockResolvedValue({
        tokenType: AuthTokenTypeClientKey,
        tokenKeyId: "new-kid",
        tokenValue: "new-v",
        expiresAt: freshExpires,
      });
    await m.refreshToken();
    expect(spy).toHaveBeenCalledWith("arn");
    expect(lw.info).toHaveBeenCalledWith(
      "Token for AAP ARN %s needs refresh",
      "arn",
    );
    expect(lw.info).toHaveBeenCalledWith(
      "Successfully refreshed token for AAP ARN %s, expires at %s",
      "arn",
      freshExpires,
    );
    spy.mockRestore();
    m.close();
  });

  test("TestMAuth_RefreshToken_StillNearExpiry_Warn", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
    (m as any).cacheToken = new Map([
      [
        "arn",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "kid",
          tokenValue: "v",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    ]);
    // getToken 返回的仍是短有效期 token（拿了缓存）
    const cachedExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const spy = jest.spyOn(m, "getToken").mockResolvedValue({
      tokenType: AuthTokenTypeClientKey,
      tokenKeyId: "kid",
      tokenValue: "v",
      expiresAt: cachedExpires,
    });
    await m.refreshToken();
    expect(lw.warn).toHaveBeenCalledWith(
      "Using cached token for AAP ARN %s, expires at %s",
      "arn",
      cachedExpires,
    );
    spy.mockRestore();
    m.close();
  });

  test("TestMAuth_RefreshToken_GetTokenError_ContinueWithoutThrow", async () => {
    const lw = mockLogger();
    const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
    (m as any).cacheToken = new Map([
      [
        "arn",
        {
          tokenType: AuthTokenTypeClientKey,
          tokenKeyId: "kid",
          tokenValue: "v",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    ]);
    const spy = jest
      .spyOn(m, "getToken")
      .mockRejectedValue(new Error("network down"));
    await expect(m.refreshToken()).resolves.toBeUndefined();
    expect(lw.error).toHaveBeenCalledWith(
      "Failed to refresh token for %s: %s",
      "arn",
      expect.any(Error),
    );
    spy.mockRestore();
    m.close();
  });

  test("TestMAuth_RefreshTimer_UnexpectedError_StopsTimer", async () => {
    jest.useFakeTimers();
    try {
      const lw = mockLogger();
      const m = new MAuth(makeAckCfg(undefined, "arn"), lw);
      // 模拟非预期异常：refreshToken 直接 reject
      (m as any).refreshToken = () => Promise.reject(new Error("boom"));
      // advanceTimersByTimeAsync 推进定时器并自动冲刷 promise 微任务链
      await jest.advanceTimersByTimeAsync(REFRESH_INTERVAL_MILLIS);
      expect(lw.error).toHaveBeenCalledWith(
        "Unexpected error in refreshToken timer: %s",
        expect.any(Error),
      );
      expect((m as any).refreshTimer).toBeUndefined();
      m.close();
    } finally {
      jest.useRealTimers();
    }
  });

  test("TestMAuth_ClearToken_WithOverride", () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    (m as any).cacheToken = new Map([
      ["arn", { expiresAt: new Date() }],
      ["other-arn", { expiresAt: new Date() }],
    ]);
    m.clearToken("other-arn");
    expect((m as any).cacheToken.has("other-arn")).toBe(false);
    expect((m as any).cacheToken.has("arn")).toBe(true);
    m.close();
  });

  test("TestMAuth_ClearToken_NilCache_NoThrow", () => {
    const m = new MAuth(makeAckCfg(undefined, "arn"), mockLogger());
    expect(() => m.clearToken()).not.toThrow();
    expect(() => m.clearToken("override")).not.toThrow();
    m.close();
  });
});
