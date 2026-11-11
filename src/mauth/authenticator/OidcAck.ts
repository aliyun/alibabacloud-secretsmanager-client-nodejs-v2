import * as fs from "fs";
import { Authenticator, Identity } from "./Authenticator";
import { IdentityTypeJWT } from "./Config";
import { JwtUtils } from "../utils/JwtUtils";

/**
 * ACK OIDC JWT 认证器
 */
export class AckOidcAuthenticator implements Authenticator {
  tokenPath: string;

  constructor(tokenPath: string) {
    this.tokenPath = tokenPath;
  }

  /**
   * getIdentity 获取身份信息详情
   */
  async getIdentity(): Promise<Identity> {
    // 从磁盘读取 JWT（直接按 utf-8 读成字符串）
    let token: string;
    try {
      token = (await fs.promises.readFile(this.tokenPath, "utf-8")).trim();
    } catch (e) {
      throw new Error(`failed to read token file: ${(e as Error).message}`);
    }

    // 校验 JWT 格式
    if (!JwtUtils.isValidJWT(token)) {
      throw new Error("invalid JWT format");
    }

    // 构造身份信息
    return {
      identityType: IdentityTypeJWT,
      identityValue: token,
    };
  }
}
