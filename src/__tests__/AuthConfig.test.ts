import { describe, expect, test, afterEach } from "@jest/globals";
import {
  ACKOidcJwt,
  AuthConfig,
  ClientKey,
  ECSInstanceIdentity,
} from "../mauth/config/Config";
import { cleanupTempFiles, createTempFile } from "./helpers/tmp";

afterEach(() => {
  cleanupTempFiles();
});

describe("AuthConfig", () => {
  test("TestAuthConfig_Validate_ClientKey_WithPassword", () => {
    const tmpFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpFile;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).not.toThrow();
  });

  test("TestAuthConfig_Validate_ClientKey_WithPasswordPath", () => {
    const tmpConfigFile = createTempFile("client_key_config_");
    const tmpPwdFile = createTempFile("client_key_password_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPasswordPath = tmpPwdFile;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).not.toThrow();
  });

  test("TestAuthConfig_Validate_ClientKey_MissingPassword", () => {
    const tmpFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpFile;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "ClientKeyPassword or ClientKeyPasswordPath is required",
    );
  });

  test("TestAuthConfig_Validate_ClientKey_MissingConfigPath", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "ClientKeyConfigPath is required for Client Key authentication",
    );
  });

  test("TestAuthConfig_Validate_ClientKey_ConfigFileNotExist", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = "/not/exist/config.json";
    cfg.clientKeyPassword = "test_password";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "client key config file does not exist",
    );
  });

  test("TestAuthConfig_Validate_ClientKey_PasswordFileNotExist", () => {
    const tmpConfigFile = createTempFile("client_key_config_");

    const cfg = new AuthConfig();
    cfg.authMethod = ClientKey;
    cfg.clientKeyConfigPath = tmpConfigFile;
    cfg.clientKeyPasswordPath = "/not/exist/password.txt";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "client key password file does not exist",
    );
  });

  test("TestAuthConfig_Validate_ACKOidcJwt_Success", () => {
    const tmpTokenFile = createTempFile("token_");

    const cfg = new AuthConfig();
    cfg.authMethod = ACKOidcJwt;
    cfg.aapArn = "arn:test:aap";
    cfg.tokenPath = tmpTokenFile;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).not.toThrow();
  });

  test("TestAuthConfig_Validate_ACKOidcJwt_DoesNotCheckFileExistence", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ACKOidcJwt;
    cfg.aapArn = "arn:test:aap";
    cfg.tokenPath = "/not/exist/token.txt";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    // AuthConfig.Validate 只校验配置字段，不检查 token 文件在磁盘上的存在性
    expect(() => cfg.validate()).not.toThrow();
  });

  test("TestAuthConfig_Validate_ACKOidcJwt_MissingAapArn", () => {
    const tmpTokenFile = createTempFile("token_");

    const cfg = new AuthConfig();
    cfg.authMethod = ACKOidcJwt;
    cfg.tokenPath = tmpTokenFile;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "AapArn is required for ACK OIDC JWT authentication",
    );
  });

  test("TestAuthConfig_Validate_ECSInstanceIdentity_Success", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ECSInstanceIdentity;
    cfg.aapArn = "arn:test:aap";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).not.toThrow();
  });

  test("TestAuthConfig_Validate_ECSInstanceIdentity_MissingAapArn", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ECSInstanceIdentity;
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "AapArn is required for ECS Instance Identity authentication",
    );
  });

  test("TestAuthConfig_Validate_EmptyAuthMethod", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = "";

    expect(() => cfg.validate()).toThrow("AuthMethod is required");
  });

  test("TestAuthConfig_Validate_MissingKmsEndpoint", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = ECSInstanceIdentity;
    cfg.aapArn = "arn:test:aap";

    expect(() => cfg.validate()).toThrow("KmsEndpoint is required");
  });

  test("TestAuthConfig_Validate_UnsupportedAuthMethod", () => {
    const cfg = new AuthConfig();
    cfg.authMethod = "UnknownMethod";
    cfg.kmsEndpoint = "https://kms.cn-hangzhou.aliyuncs.com";

    expect(() => cfg.validate()).toThrow(
      "unsupported authentication method: UnknownMethod",
    );
  });
});
