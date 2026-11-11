import * as fs from "fs";

/**
 * JWT 工具类
 */
export class JwtUtils {
  /**
   * isValidJWT 简单的 JWT 格式校验（不进行验签，只检查结构）
   * @param token JWT 令牌
   * @returns 是否为合法 JWT 结构
   */
  static isValidJWT(token: string): boolean {
    // JWT 必须由两点分隔成三个部分 (Header.Payload.Signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // 简单的 Base64 解码检查，确保它是合法的 JSON 结构
    for (const part of parts.slice(0, 2)) {
      // base64url 字符集校验必须针对原始段：addPadding 会把 -/_ 换成 +//，
      // 若改成对转换后的串做 base64url 校验，凡是编码后含 +// 的合法 JWT 都会被误拒。
      if (!/^[A-Za-z0-9\-_=]+$/.test(part)) {
        return false;
      }
      // JWT 使用 URL-safe Base64，需要填充 padding
      const p = JwtUtils.addPadding(part);
      // Buffer 的 base64 解码宽松不抛错
      const decoded = Buffer.from(p, "base64");
      // 增加 JSON 结构体检查
      try {
        const js = JSON.parse(decoded.toString("utf-8"));
        if (typeof js !== "object" || js === null || Array.isArray(js)) {
          return false; // 如果不是有效的 JSON 对象，那肯定不是 JWT
        }
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  private static addPadding(s: string): string {
    const l = s.length % 4;
    if (l === 2) {
      s += "==";
    } else if (l === 3) {
      s += "=";
    }
    // base64url 转标准 base64 字符集
    return s.replace(/-/g, "+").replace(/_/g, "/");
  }

  /**
   * ParseJWTClaims 解析 JWT 的 Claims 部分
   * @param token JWT 令牌
   * @returns Claims 键值对
   */
  static parseJWTClaims(token: string): Record<string, any> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("invalid JWT format: not 3 parts");
    }

    const payload = parts[1];

    // 添加必要的 padding
    const paddedPayload = JwtUtils.addPadding(payload);

    // 解码 payload 并解析 JSON（Buffer 的 base64 解码宽松不抛错）
    let claims: Record<string, any>;
    try {
      claims = JSON.parse(
        Buffer.from(paddedPayload, "base64").toString("utf-8"),
      );
    } catch (e) {
      throw new Error(
        `failed to parse JWT claims: ${(e as Error).message}`,
      );
    }

    return claims;
  }

  /**
   * IsValidJWTFile 检查JWT文件是否存在且格式有效
   * @param filePath JWT 文件路径
   * @returns 文件是否存在且为合法 JWT
   */
  static isValidJWTFile(filePath: string): boolean {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // 读取文件内容（直接按 utf-8 读成字符串，省去 Buffer 中间层）
    let token: string;
    try {
      token = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      return false;
    }

    return JwtUtils.isValidJWT(token.trim());
  }

  /**
   * GetJWTExpiration 获取 JWT 的过期时间
   * @param token JWT 令牌
   * @returns 过期时间
   */
  static getJWTExpiration(token: string): Date {
    const claims = JwtUtils.parseJWTClaims(token);

    // 检查 exp 字段是否存在
    const expValue = claims["exp"];
    if (expValue === undefined) {
      throw new Error("JWT does not contain 'exp' claim");
    }

    // 将 exp 转换为 int64 时间戳
    let expInt: number;
    if (typeof expValue === "number") {
      expInt = Math.trunc(expValue);
    } else if (typeof expValue === "string" && /^-?\d+$/.test(expValue)) {
      expInt = parseInt(expValue, 10);
    } else {
      throw new Error(
        `'exp' claim is not a number: ${typeof expValue}`,
      );
    }

    // 将 Unix 时间戳转换为 Date
    return new Date(expInt * 1000);
  }
}
