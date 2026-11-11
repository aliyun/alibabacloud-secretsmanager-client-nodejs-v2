import { ACKOidcJwt, ECSInstanceIdentity } from "../config/Config";
import { Config, DefaultACKTokenPath } from "./Config";
import { AckOidcAuthenticator } from "./OidcAck";
import { ECSAuthenticator } from "./InstanceIdentityEcs";

/**
 * 身份信息
 */
export interface Identity {
  identityType: string;
  identityValue: string;
  /** 过期时间；未赋值表示该认证器不提供过期信息 */
  expiresAt?: Date;
}

/**
 * 认证器接口
 */
export interface Authenticator {
  getIdentity(): Promise<Identity>;
}

/**
 * AuthenticatorManager 根据配置创建并持有具体认证器
 */
export class AuthenticatorManager implements Authenticator {
  private readonly authenticator: Authenticator;

  /**
   * 根据配置创建认证管理器
   * @param config 认证器配置
   */
  constructor(config: Config) {
    // 首先验证配置
    try {
      config.validateConfig();
    } catch (e) {
      throw new Error(`invalid config: ${(e as Error).message}`);
    }

    switch (config.authMethod) {
      case ACKOidcJwt: {
        let tokenPath = config.tokenPath;
        // 默认 ack token path
        if (!tokenPath) {
          tokenPath = DefaultACKTokenPath;
        }
        this.authenticator = new AckOidcAuthenticator(tokenPath);
        break;
      }
      case ECSInstanceIdentity:
        this.authenticator = new ECSAuthenticator();
        break;
      default:
        throw new Error(
          `unsupported authentication method: ${config.authMethod}`,
        );
    }
  }

  /**
   * getIdentity 获取身份信息详情
   */
  getIdentity(): Promise<Identity> {
    return this.authenticator.getIdentity();
  }
}
