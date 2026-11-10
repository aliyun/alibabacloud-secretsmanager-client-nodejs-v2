import { CredentialsProviderUtils } from "../utils/CredentialsProviderUtils";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { beforeEach, describe, expect, test } from "@jest/globals";

describe("CredentialsProviderUtils", () => {
  beforeEach(() => {
    delete process.env[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY];
    delete process.env[
      CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY
    ];
    delete process.env[
      CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY
    ];
    delete process.env[CacheClientConstant.VARIABLE_CREDENTIALS_ROLE_NAME_KEY];
    delete process.env[
      CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_ARN_KEY
    ];
    delete process.env[
      CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_PROVIDER_ARN_KEY
    ];
    delete process.env[
      CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_TOKEN_FILE_PATH_KEY
    ];
  });

  test("should create access key credentials provider", () => {
    const provider = CredentialsProviderUtils.withAccessKey(
      "testAccessKeyId",
      "testAccessKeySecret",
    );
    expect(provider).toBeDefined();
  });

  test("should create ECS RAM role credentials provider", () => {
    const provider = CredentialsProviderUtils.withEcsRamRole("testRoleName");
    expect(provider).toBeDefined();
  });

  test("should create default credential chain provider", () => {
    const provider = CredentialsProviderUtils.withDefaultCredential();
    expect(provider).toBeDefined();
    expect(typeof provider.getCredentials).toBe("function");
    expect(provider.getProviderName()).toBe("default");
  });

  test("should create OIDC role ARN credentials provider with full parameters", () => {
    const provider = CredentialsProviderUtils.withOIDCRoleArn(
      "testSession",
      "testRoleArn",
      "testOidcProviderArn",
      "/path/to/token",
      "testPolicy",
      "sts.cn-hangzhou.aliyuncs.com",
      3600,
      "cn-hangzhou",
    );
    expect(provider).toBeDefined();
  });

  test("should create OIDC role ARN credentials provider with simplified parameters", () => {
    const provider = CredentialsProviderUtils.withOIDCRoleArnSimple(
      "testRoleArn",
      "testOidcProviderArn",
      "/path/to/token",
    );
    expect(provider).toBeDefined();
  });

  test("should initialize credentials provider from environment variables", () => {
    process.env[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] = "ak";
    process.env[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY] =
      "testAccessKeyId";
    process.env[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY] =
      "testAccessKeySecret";

    const provider = CredentialsProviderUtils.initCredentialFromEnv(
      process.env,
    );
    expect(provider).toBeDefined();
  });

  test("should initialize credentials provider from properties", () => {
    const props: Record<string, string> = {};
    props[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] = "ak";
    props[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY] =
      "testAccessKeyId";
    props[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY] =
      "testAccessKeySecret";

    const provider = CredentialsProviderUtils.initCredentialFromConfig(props);
    expect(provider).toBeDefined();
  });

  test("should initialize KMS regions from properties", () => {
    const props: Record<string, string> = {};
    props[CacheClientConstant.VARIABLE_CACHE_CLIENT_REGION_ID_KEY] =
      '[{"regionId":"cn-hangzhou","endpoint":"kms.cn-hangzhou.aliyuncs.com"}]';

    const regions = CredentialsProviderUtils.initKmsRegions(props, "test");
    expect(regions).toBeDefined();
    expect(Array.isArray(regions)).toBe(true);
    expect(regions.length).toBeGreaterThan(0);
  });

  test("should handle invalid credential type", () => {
    const invalidMap: Record<string, string> = {};
    invalidMap[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] =
      "invalid_type";

    expect(() => {
      CredentialsProviderUtils.initCredential(invalidMap, "test");
    }).toThrow();
  });

  test("should handle missing AK parameters", () => {
    const incompleteAkMap: Record<string, string> = {};
    incompleteAkMap[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] = "ak";

    expect(() => {
      CredentialsProviderUtils.initCredential(incompleteAkMap, "test");
    }).toThrow();
  });

  test("should handle valid access key type with all parameters", () => {
    const akMap: Record<string, string> = {};
    akMap[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] = "ak";
    akMap[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY] =
      "testAccessKeyId";
    akMap[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY] =
      "testAccessKeySecret";

    const provider = CredentialsProviderUtils.initCredential(akMap, "test");
    expect(provider).toBeDefined();
  });

  test("should handle ECS RAM role type", () => {
    const ecsMap: Record<string, string> = {};
    ecsMap[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] = "ecs_ram_role";
    ecsMap[CacheClientConstant.VARIABLE_CREDENTIALS_ROLE_NAME_KEY] = "testRole";

    const provider = CredentialsProviderUtils.initCredential(ecsMap, "test");
    expect(provider).toBeDefined();
  });

  test("should handle OIDC role ARN type", () => {
    const oidcMap: Record<string, string> = {};
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY] =
      "oidc_role_arn";
    oidcMap[
      CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_SESSION_NAME_KEY
    ] = "testSession";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_ARN_KEY] =
      "testRoleArn";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_PROVIDER_ARN_KEY] =
      "testProviderArn";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_TOKEN_FILE_PATH_KEY] =
      "/path/to/token";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_STS_REGION_ID_KEY] =
      "cn-hangzhou";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_POLICY_KEY] =
      "testPolicy";
    oidcMap[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_STS_ENDPOINT_KEY] =
      "sts.cn-hangzhou.aliyuncs.com";

    const provider = CredentialsProviderUtils.initCredential(oidcMap, "test");
    expect(provider).toBeDefined();
  });

  test("should handle environment variables mapping properly", () => {
    const envMap = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]: "ak",
      [CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY]:
        "testAccessKeyId",
      [CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY]:
        "testAccessKeySecret",
    };

    const provider = CredentialsProviderUtils.initCredentialFromEnv(envMap);
    expect(provider).toBeDefined();
  });

  test("should return undefined when no credentials type is specified", () => {
    const emptyMap: Record<string, string> = {};

    const result = CredentialsProviderUtils.initCredential(emptyMap, "test");
    expect(result).toBeUndefined();
  });
});

describe("CredentialsProviderUtils.initMAuthConfig", () => {
  test("TestInitMAuthConfig_ClientKey_WithEnvPassword", () => {
    const envName = "TEST_CLIENT_KEY_PASSWORD_ENV";
    process.env[envName] = "test_password_from_env";

    try {
      const configMap: Record<string, string> = {
        [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
          CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY,
        [CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY]:
          "/path/to/client_key.json",
        [CacheClientConstant
          .VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY]: envName,
      };

      const cfg = CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      );
      expect(cfg).toBeDefined();
      expect(cfg?.authMethod).toBe("ClientKey");
      expect(cfg?.clientKeyConfigPath).toBe("/path/to/client_key.json");
      expect(cfg?.clientKeyPassword).toBe("test_password_from_env");
      // 可选字段未设置时为 undefined
      expect(cfg?.clientKeyPasswordPath).toBeUndefined();
    } finally {
      delete process.env[envName];
    }
  });

  test("TestInitMAuthConfig_ClientKey_WithEnvPassword_NotSet", () => {
    delete process.env["TEST_CLIENT_KEY_PASSWORD_NOT_SET"];

    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY,
      [CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY]:
        "/path/to/client_key.json",
      [CacheClientConstant
        .VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY]:
        "TEST_CLIENT_KEY_PASSWORD_NOT_SET",
    };

    expect(() =>
      CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      ),
    ).toThrow(
      new RegExp(
        `${CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY}.*${CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_PATH_KEY}`,
      ),
    );
  });

  test("TestInitMAuthConfig_ClientKey_WithPasswordPath", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY,
      [CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY]:
        "/path/to/client_key.json",
      [CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_PATH_KEY]:
        "/path/to/password",
    };

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeDefined();
    expect(cfg?.clientKeyPasswordPath).toBe("/path/to/password");
    // 可选字段未设置时为 undefined
    expect(cfg?.clientKeyPassword).toBeUndefined();
  });

  test("TestInitMAuthConfig_ClientKey_MissingPassword", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY,
      [CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY]:
        "/path/to/client_key.json",
    };

    expect(() =>
      CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      ),
    ).toThrow(
      new RegExp(
        `${CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY}.*${CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_PATH_KEY}`,
      ),
    );
  });

  test("TestInitMAuthConfig_ClientKey_MissingConfigPath", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY,
      [CacheClientConstant
        .VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY]: "TEST_PWD",
    };

    expect(() =>
      CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      ),
    ).toThrow(
      CacheClientConstant.VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY,
    );
  });

  test("TestInitMAuthConfig_ACKOidcJwt_Success", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_ACK_OIDC_JWT,
      [CacheClientConstant.VARIABLE_CREDENTIALS_AAP_ARN_KEY]: "arn:test:aap",
      [CacheClientConstant.VARIABLE_CREDENTIALS_TOKEN_PATH_KEY]:
        "/path/to/token",
    };

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeDefined();
    expect(cfg?.authMethod).toBe("ACKOidcJwt");
    expect(cfg?.aapArn).toBe("arn:test:aap");
    expect(cfg?.tokenPath).toBe("/path/to/token");
  });

  test("TestInitMAuthConfig_ACKOidcJwt_MissingAapArn", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_ACK_OIDC_JWT,
      [CacheClientConstant.VARIABLE_CREDENTIALS_TOKEN_PATH_KEY]:
        "/path/to/token",
    };

    expect(() =>
      CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      ),
    ).toThrow(CacheClientConstant.VARIABLE_CREDENTIALS_AAP_ARN_KEY);
  });

  test("TestInitMAuthConfig_ACKOidcJwt_MissingTokenPath", () => {
    // ACKOidcJwt 分支的校验不检查 TokenPath：tokenPath 可选
    // （缺省时使用 DefaultACKTokenPath），配置校验不报错。
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_ACK_OIDC_JWT,
      [CacheClientConstant.VARIABLE_CREDENTIALS_AAP_ARN_KEY]: "arn:test:aap",
    };

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeDefined();
    expect(cfg?.authMethod).toBe("ACKOidcJwt");
    expect(cfg?.aapArn).toBe("arn:test:aap");
    expect(cfg?.tokenPath).toBeUndefined();
  });

  test("TestInitMAuthConfig_ECSInstanceIdentity_Success", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_ECS_INSTANCE_IDENTITY,
      [CacheClientConstant.VARIABLE_CREDENTIALS_AAP_ARN_KEY]: "arn:test:aap",
    };

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeDefined();
    expect(cfg?.authMethod).toBe("ECSInstanceIdentity");
    expect(cfg?.aapArn).toBe("arn:test:aap");
  });

  test("TestInitMAuthConfig_ECSInstanceIdentity_MissingAapArn", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]:
        CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_ECS_INSTANCE_IDENTITY,
    };

    expect(() =>
      CredentialsProviderUtils.initMAuthConfig(
        configMap,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      ),
    ).toThrow(CacheClientConstant.VARIABLE_CREDENTIALS_AAP_ARN_KEY);
  });

  test("TestInitMAuthConfig_EmptyCredentialsType", () => {
    const configMap: Record<string, string> = {};

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeUndefined();
  });

  test("TestInitMAuthConfig_UnsupportedCredentialsType", () => {
    const configMap: Record<string, string> = {
      [CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY]: "unsupported_type",
    };

    const cfg = CredentialsProviderUtils.initMAuthConfig(
      configMap,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
    expect(cfg).toBeUndefined();
  });
});
