import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigUtils } from "../utils/ConfigUtils";
import { CacheClientConstant } from "../index";

describe("ConfigUtils", () => {
  const testConfigName = "test-config.properties";
  const testConfigPath = path.join(process.cwd(), testConfigName);
  const homeDirConfigPath = path.join(os.homedir(), testConfigName);
  const aliyunDirConfigPath = path.join(
    os.homedir(),
    ".aliyun",
    testConfigName,
  );

  beforeEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(homeDirConfigPath)) {
      fs.unlinkSync(homeDirConfigPath);
    }
    if (fs.existsSync(aliyunDirConfigPath)) {
      fs.unlinkSync(aliyunDirConfigPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(homeDirConfigPath)) {
      fs.unlinkSync(homeDirConfigPath);
    }
    if (fs.existsSync(aliyunDirConfigPath)) {
      fs.unlinkSync(aliyunDirConfigPath);
    }
  });

  test("should load config from current directory", () => {
    const testConfig = `# Test configuration
${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=ak
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY}=testAccessKeyId
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY}=testAccessKeySecret
${CacheClientConstant.VARIABLE_REGION_REGION_ID_NAME_KEY}=cn-hangzhou`;

    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("ak");
    expect(config!["credentials_access_key_id"]).toBe("testAccessKeyId");
    expect(config!["credentials_access_secret"]).toBe("testAccessKeySecret");
    expect(config!["regionId"]).toBe("cn-hangzhou");
  });

  test("should load config from home directory", () => {
    const testConfig = `# Test configuration
${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=ecs_ram_role
${CacheClientConstant.VARIABLE_CREDENTIALS_ROLE_NAME_KEY}=testRole
${CacheClientConstant.VARIABLE_REGION_REGION_ID_NAME_KEY}=cn-shanghai`;

    fs.writeFileSync(homeDirConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("ecs_ram_role");
    expect(config!["credentials_role_name"]).toBe("testRole");
    expect(config!["regionId"]).toBe("cn-shanghai");
  });

  test("should load config from .aliyun directory in home", () => {
    const aliyunDir = path.join(os.homedir(), ".aliyun");
    if (!fs.existsSync(aliyunDir)) {
      fs.mkdirSync(aliyunDir, { recursive: true });
    }

    const testConfig = `# Test configuration
${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=oidc_role_arn
${CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_ARN_KEY}=testRoleArn
${CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_PROVIDER_ARN_KEY}=testProviderArn`;

    fs.writeFileSync(aliyunDirConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("oidc_role_arn");
    expect(config!["credentials_role_arn"]).toBe("testRoleArn");
    expect(config!["credentials_oidc_provider_arn"]).toBe("testProviderArn");
  });

  test("should return undefined when config file does not exist", () => {
    const config = ConfigUtils.loadConfig("nonexistent-config.properties");
    expect(config).toBeUndefined();
  });

  test("should handle config file with comments and empty lines", () => {
    const testConfig = `# This is a comment
${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=ak

# Another comment
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY}=testAccessKeyId
  # Indented comment
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY}=testAccessSecret
# Final comment`;

    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("ak");
    expect(config!["credentials_access_key_id"]).toBe("testAccessKeyId");
    expect(config!["credentials_access_secret"]).toBe("testAccessSecret");
    expect(Object.keys(config!).length).toBe(3);
  });

  test("should handle config file with different line endings", () => {
    const testConfig = `${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=ak\r\n${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY}=testAccessKeyId\r\n`;
    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("ak");
    expect(config!["credentials_access_key_id"]).toBe("testAccessKeyId");
  });

  test("should handle config file with malformed lines", () => {
    const testConfig = `${CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY}=ak
malformedLineWithoutEqualsSign
another.malformed=line=with=multiple=equals
normal.line=value`;

    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_type"]).toBe("ak");
    expect(config!["another.malformed"]).toBe("line=with=multiple=equals");
    expect(config!["normal.line"]).toBe("value");
    expect(Object.keys(config!).length).toBe(3);
  });


  test("should check if file exists", () => {
    fs.writeFileSync(testConfigPath, "test=config");
    expect(ConfigUtils.exists(testConfigPath)).toBe(true);

    expect(ConfigUtils.exists("/nonexistent/path/file.txt")).toBe(false);

    fs.unlinkSync(testConfigPath);
  });


  test("should get config file locations", () => {
    const locations = ConfigUtils.getConfigFileLocations(testConfigName);
    expect(locations).toHaveLength(4);
    expect(locations).toContain(path.join(process.cwd(), "config", testConfigName));
    expect(locations).toContain(testConfigPath);
    expect(locations).toContain(aliyunDirConfigPath);
    expect(locations).toContain(homeDirConfigPath);
  });

  test("should handle special characters in config values", () => {
    const testConfig = `# Test configuration with special characters
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY}=access_key_with_special_chars!@#
${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY}=secret_with_$ymbols_%^&
${CacheClientConstant.VARIABLE_REGION_REGION_ID_NAME_KEY}=cn-hangzhou-with-dashes
complex.property=value=with=equals=signs
path.property=/path/to/config/file
quote.property="quoted value"
json.property={"key":"value","array":[1,2,3]}`;

    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["credentials_access_key_id"]).toBe(
      "access_key_with_special_chars!@#",
    );
    expect(config!["credentials_access_secret"]).toBe(
      "secret_with_$ymbols_%^&",
    );
    expect(config!["regionId"]).toBe("cn-hangzhou-with-dashes");
    expect(config!["complex.property"]).toBe("value=with=equals=signs");
    expect(config!["path.property"]).toBe("/path/to/config/file");
    expect(config!["quote.property"]).toBe('"quoted value"');
    expect(config!["json.property"]).toBe('{"key":"value","array":[1,2,3]}');
  });

  test("should handle large config files", () => {
    let configContent = "# Large configuration file\n";
    for (let i = 0; i < 100; i++) {
      configContent += `property.${i}=value${i}\n`;
    }

    fs.writeFileSync(testConfigPath, configContent);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(Object.keys(config!).length).toBe(100);

    expect(config!["property.0"]).toBe("value0");
    expect(config!["property.50"]).toBe("value50");
    expect(config!["property.99"]).toBe("value99");
  });

  test("should handle unicode characters in config", () => {
    const testConfig = `# Test configuration with Unicode
unicode.key=测试值
chinese.region=中国-杭州
japanese.key=こんにちは
emoji.key=🚀🌟🔥
mixed.content=Test测试123`;

    fs.writeFileSync(testConfigPath, testConfig);

    const config = ConfigUtils.loadConfig(testConfigName);
    expect(config).toBeDefined();
    expect(config!["unicode.key"]).toBe("测试值");
    expect(config!["chinese.region"]).toBe("中国-杭州");
    expect(config!["japanese.key"]).toBe("こんにちは");
    expect(config!["emoji.key"]).toBe("🚀🌟🔥");
    expect(config!["mixed.content"]).toBe("Test测试123");
  });
});
