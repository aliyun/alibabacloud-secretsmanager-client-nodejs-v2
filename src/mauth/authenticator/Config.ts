import { ACKOidcJwt, ECSInstanceIdentity } from "../config/Config";
import { JwtUtils } from "../utils/JwtUtils";

export const IdentityTypePKCS7 = "PKCS7";
export const IdentityTypeJWT = "JWT";

export const DefaultACKTokenPath =
  "/var/run/secrets/kubernetes.io/serviceaccount/token";

/**
 * 认证器配置
 */
export class Config {
  /** Must */
  authMethod?: string;
  /** ACKOidcJwt config */
  tokenPath?: string;

  /**
   * ValidateConfig 验证配置参数是否合法
   */
  validateConfig(): void {
    switch (this.authMethod) {
      case ECSInstanceIdentity:
        break;
      case ACKOidcJwt:
        // 检查 JWT 文件是否存在且格式合法
        if (this.tokenPath) {
          if (!JwtUtils.isValidJWTFile(this.tokenPath)) {
            throw new Error(
              `token file does not exist or has invalid JWT format: ${this.tokenPath}`,
            );
          }
        }
        break;
      default:
        throw new Error(
          `unsupported authentication method: ${this.authMethod}`,
        );
    }
  }
}
