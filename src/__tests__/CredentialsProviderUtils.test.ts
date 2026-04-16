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
