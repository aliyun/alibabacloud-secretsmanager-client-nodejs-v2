import { Config, ExchangerTypeKms, validateConfig } from "./Config";
import { KmsExchanger } from "./KmsExchanger";

/**
 * 凭据置换结果
 */
export interface ExchangeResult {
  /** 凭据类型 */
  tokenType: string;
  /** 凭据内容 */
  tokenValue: string;
}

/**
 * 凭据置换器接口
 */
export interface Exchanger {
  /**
   * 使用身份令牌置换临时凭据
   * @param bearerToken 身份令牌
   * @param aapArn 可选的 AapArn 覆盖值（非空时优先于实例配置）
   */
  exchangeCredential(
    bearerToken: string,
    aapArn?: string,
  ): Promise<ExchangeResult>;
}

/**
 * ExchangerManager 根据配置创建并持有具体置换器
 */
export class ExchangerManager implements Exchanger {
  private readonly exchanger: Exchanger;

  /**
   * 根据配置创建置换器管理器
   * @param config 置换器配置
   */
  constructor(config: Config) {
    // 首先验证配置
    try {
      validateConfig(config);
    } catch (e) {
      throw new Error(`invalid config: ${(e as Error).message}`);
    }

    switch (config.exchangerType) {
      case ExchangerTypeKms:
        this.exchanger = new KmsExchanger(
          config.kmsEndpoint!,
          config.aapArn,
          config.ca,
        );
        break;
      default:
        throw new Error(
          `unsupported exchanger type: ${config.exchangerType}`,
        );
    }
  }

  /**
   * exchangeCredential 使用身份令牌置换临时凭据
   */
  exchangeCredential(
    bearerToken: string,
    aapArn?: string,
  ): Promise<ExchangeResult> {
    return this.exchanger.exchangeCredential(bearerToken, aapArn);
  }
}
