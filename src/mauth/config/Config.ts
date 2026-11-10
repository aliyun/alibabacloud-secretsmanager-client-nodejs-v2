import * as fs from "fs";

/**
 * AuthConfig 认证配置
 */
export class AuthConfig {
  /** 认证方式 */
  authMethod?: string;
  /** AAP ID */
  aapArn?: string;
  /** 令牌路径（用于ACK OIDC） */
  tokenPath?: string;
  /** ClientKey配置路径 */
  clientKeyConfigPath?: string;
  /** ClientKeyPassword ClientKey密码值（可从环境变量间接获取） */
  clientKeyPassword?: string;
  /** ClientKeyPasswordPath ClientKey密码文件路径 */
  clientKeyPasswordPath?: string;
  /** KmsEndpoint KMS端点 */
  kmsEndpoint?: string;
  ca?: string;

  /**
   * 校验配置参数
   * 1. 文件路径参数不为空的话，要校验是否存在这文件
   * 2. 除 Client Key 以外，都要存在 AapArn
   */
  validate(): void {
    // 检查认证方式是否为空
    if (!this.authMethod) {
      throw new Error("AuthMethod is required");
    }
    if (!this.kmsEndpoint) {
      throw new Error("KmsEndpoint is required");
    }

    // 检查不同认证方式的特定要求
    switch (this.authMethod) {
      case ACKOidcJwt:
        if (!this.aapArn) {
          throw new Error(
            "AapArn is required for ACK OIDC JWT authentication",
          );
        }
        break;
      case ECSInstanceIdentity:
        if (!this.aapArn) {
          throw new Error(
            "AapArn is required for ECS Instance Identity authentication",
          );
        }
        break;
      case ClientKey: {
        // Client Key 认证不需要 AAP ID
        // ClientKeyConfigPath 不为空时，需要校验文件是否存在
        if (!this.clientKeyConfigPath) {
          throw new Error(
            "ClientKeyConfigPath is required for Client Key authentication",
          );
        }
        if (!fs.existsSync(this.clientKeyConfigPath)) {
          throw new Error(
            `client key config file does not exist: ${this.clientKeyConfigPath}`,
          );
        }
        // 如果 ClientKeyPassword 为空，则需要检查 ClientKeyPasswordPath
        if (!this.clientKeyPassword) {
          if (!this.clientKeyPasswordPath) {
            throw new Error(
              "ClientKeyPassword or ClientKeyPasswordPath is required for Client Key authentication",
            );
          }
          if (!fs.existsSync(this.clientKeyPasswordPath)) {
            throw new Error(
              `client key password file does not exist: ${this.clientKeyPasswordPath}`,
            );
          }
        }
        break;
      }
      default:
        throw new Error(
          `unsupported authentication method: ${this.authMethod}`,
        );
    }
  }
}

export const ECSInstanceIdentity = "ECSInstanceIdentity";
export const ACKOidcJwt = "ACKOidcJwt";
export const ClientKey = "ClientKey";
