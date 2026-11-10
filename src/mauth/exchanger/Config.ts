/**
 * 凭据置换器配置
 */
export class Config {
  exchangerType?: string;
  /** kms */
  kmsEndpoint?: string;
  aapArn?: string;
  ca?: string;
}

export const ExchangerTypeKms = "kms";

/**
 * ValidateConfig 验证配置参数是否合法
 * @param config 置换器配置
 */
export function validateConfig(config: Config): void {
  switch (config.exchangerType) {
    case ExchangerTypeKms:
      // ECS 实例认证需要 AAP ID
      if (!config.kmsEndpoint) {
        throw new Error("KmsEndpoint is required");
      }
      if (
        config.kmsEndpoint.endsWith("cryptoservice.kms.aliyuncs.com") &&
        !config.ca
      ) {
        throw new Error("use dedicate endpoint Ca is required");
      }
      break;
    default:
      throw new Error(`unsupported exchanger type: ${config.exchangerType}`);
  }
}
