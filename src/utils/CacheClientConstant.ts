/**
 * 缓存客户端常量
 */
export class CacheClientConstant {
  // 模块名称
  static readonly MODE_NAME = "SecretsManagerClientV2";

  // 项目版本
  static readonly PROJECT_VERSION = "2.0.1";

  // Secrets Manager Client Nodejs V2的User Agent
  static readonly USER_AGENT_OF_SECRETS_MANAGER_V2_NODEJS =
    "alibabacloud-secretsmanager-client-nodejs-v2";

  // 凭据文本数据类型
  static readonly TEXT_DATA_TYPE = "text";

  // 凭据二进制数据类型
  static readonly BINARY_DATA_TYPE = "binary";

  // 当前stage
  static readonly STAGE_ACS_CURRENT = "ACSCurrent";

  // 默认最大重试次数
  static readonly DEFAULT_RETRY_MAX_ATTEMPTS = 5;

  // 默认重试间隔时间(毫秒)
  static readonly DEFAULT_RETRY_INITIAL_INTERVAL_MILLS = 2000;

  // 默认最大等待时间
  static readonly DEFAULT_CAPACITY = 10000;

  // 请求等待时间(毫秒)
  static readonly REQUEST_WAITING_TIME = 2 * 60 * 1000;

  // 默认协议
  static readonly DEFAULT_PROTOCOL = "https";

  // ClientError 欠费 errorCode
  static readonly CLIENT_ERROR_CODE_FORBIDDEN_IN_DEBT_OVER_DUE =
    "Forbidden.InDebtOverdue";

  // ClientError 欠费 errorCode
  static readonly CLIENT_ERROR_CODE_FORBIDDEN_IN_DEBT = "Forbidden.InDebt";

  // 地域ID配置键名
  static readonly VARIABLE_CACHE_CLIENT_REGION_ID_KEY =
    "cache_client_region_id";

  // 凭据类型配置键名
  static readonly VARIABLE_CREDENTIALS_TYPE_KEY = "credentials_type";

  // AccessKey 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_ACCESS_KEY = "ak";

  // ECS RAM Role 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_ECS_RAM_ROLE = "ecs_ram_role";

  // OIDC Role ARN 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_OIDC_ROLE_ARN = "oidc_role_arn";

  // mauth ClientKey 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_CLIENT_KEY = "client_key";

  // mauth ACK OIDC JWT 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_ACK_OIDC_JWT = "ack_oidc_jwt";

  // mauth ECS Instance Identity 凭据类型值
  static readonly VARIABLE_CREDENTIALS_TYPE_ECS_INSTANCE_IDENTITY =
    "ecs_instance_identity";

  // mauth AAP ARN配置键名
  static readonly VARIABLE_CREDENTIALS_AAP_ARN_KEY = "aap_arn";

  // mauth令牌路径配置键名
  static readonly VARIABLE_CREDENTIALS_TOKEN_PATH_KEY = "token_path";

  // mauth ClientKey配置文件路径配置键名
  static readonly VARIABLE_CREDENTIALS_CLIENT_KEY_CONFIG_PATH_KEY =
    "client_key_private_key_path";

  // mauth ClientKey密码配置键名
  static readonly VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_KEY =
    "client_key_password";

  // mauth ClientKey密码环境变量名称配置键名
  static readonly VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_ENV_NAME_KEY =
    "client_key_password_from_env_variable";

  // mauth ClientKey密码文件路径配置键名
  static readonly VARIABLE_CREDENTIALS_CLIENT_KEY_PASSWORD_PATH_KEY =
    "client_key_password_from_file_path";

  // AccessKey ID配置键名
  static readonly VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY =
    "credentials_access_key_id";

  // AccessKey Secret配置键名
  static readonly VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY =
    "credentials_access_secret";

  // 角色名称配置键名
  static readonly VARIABLE_CREDENTIALS_ROLE_NAME_KEY = "credentials_role_name";

  // OIDC角色会话过期时间配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_DURATION_SECONDS_KEY =
    "credentials_duration_seconds";

  // OIDC凭证ARN配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_PROVIDER_ARN_KEY =
    "credentials_oidc_provider_arn";

  // OIDC令牌文件路径配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_TOKEN_FILE_PATH_KEY =
    "credentials_oidc_token_file_path";

  // OIDC角色会话名称配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_ROLE_SESSION_NAME_KEY =
    "credentials_role_session_name";

  // OIDC角色ARN配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_ROLE_ARN_KEY =
    "credentials_role_arn";

  // OIDC策略配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_POLICY_KEY = "credentials_policy";

  // OIDC sts地域ID配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_STS_REGION_ID_KEY =
    "credentials_sts_region_id";

  // OIDC sts域名配置键名
  static readonly VARIABLE_CREDENTIALS_OIDC_STS_ENDPOINT_KEY =
    "credentials_sts_endpoint";

  // 地域域名配置键名
  static readonly VARIABLE_REGION_ENDPOINT_NAME_KEY = "endpoint";

  // 地域ID配置键名
  static readonly VARIABLE_REGION_REGION_ID_NAME_KEY = "regionId";

  // VPC配置键名
  static readonly VARIABLE_REGION_VPC_NAME_KEY = "vpc";

  // CA文件路径配置键名
  static readonly VARIABLE_REGION_CA_FILE_PATH_NAME_KEY = "caFilePath";

  // 凭据配置文件名称
  static readonly CREDENTIALS_PROPERTIES_CONFIG_NAME =
    "secretsmanager.properties";

  // 配置来源类型标识
  static readonly SOURCE_TYPE_CONFIG = "config";

  // 环境变量来源类型标识
  static readonly SOURCE_TYPE_ENV = "env";

  // 实例网关域名后缀
  static readonly INSTANCE_GATEWAY_DOMAIN_SUFFIX =
    "cryptoservice.kms.aliyuncs.com";

  // KMS服务Socket连接超时错误码
  static readonly SDK_READ_TIMEOUT = "RequestTimeoutError";

  // UTF-8编码
  static readonly UTF8_ENCODING = "utf8";

  // ECONNREFUSED 错误码
  static readonly ECONNREFUSED_ERROR_CODE = "ECONNREFUSED";

  // 无效的AccessKeyId错误码
  static readonly ERROR_CODE_INVALID_ACCESS_KEY_ID_NOT_FOUND =
    "InvalidAccessKeyId.NotFound";
}
