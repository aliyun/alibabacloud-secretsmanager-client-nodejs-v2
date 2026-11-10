import axios from "axios";
import { Authenticator, Identity } from "./Authenticator";
import { IdentityTypePKCS7 } from "./Config";

/**
 * ECS 实例身份认证器
 */
export class ECSAuthenticator implements Authenticator {
  /**
   * getIdentity 获取身份信息详情
   */
  async getIdentity(): Promise<Identity> {
    // 获取新的PKCS7文档
    let token: string;
    try {
      token = await this.getMetadataToken();
    } catch (e) {
      throw new Error(`failed to get metadata token: ${(e as Error).message}`);
    }

    // audience
    const audience = `${Math.floor(Date.now() / 1000)}`;
    // 带上 Token 获取 PKCS7
    const url = `http://100.100.100.200/latest/dynamic/instance-identity/pkcs7?audience=${audience}`;

    let pkcs7Doc: string;
    try {
      const resp = await axios.get<string>(url, {
        headers: { "X-aliyun-ecs-metadata-token": token },
        timeout: 2 * 1000,
        responseType: "text",
        transformResponse: [(data) => data],
        validateStatus: () => true,
      });
      // 非 200 先抛以保留状态码；200 但 body 非字符串属异常响应，
      // 抛错让失败指向 metadata 层
      if (resp.status !== 200) {
        throw new Error(`${resp.status} ${resp.statusText}`);
      }
      if (typeof resp.data !== "string") {
        throw new Error("response body is not a string");
      }
      pkcs7Doc = resp.data;
    } catch (e) {
      throw new Error(`failed to get metadata pkcs7: ${(e as Error).message}`);
    }

    // 普通对象 JSON.stringify 不会抛错，无需接错误返回
    return {
      identityType: IdentityTypePKCS7,
      identityValue: JSON.stringify({ Document: pkcs7Doc.trim() }),
    };
  }

  /**
   * 获取 Metadata Token 的方法
   */
  private async getMetadataToken(): Promise<string> {
    let token: string;
    try {
      const resp = await axios.put<string>(
        "http://100.100.100.200/latest/api/token",
        null,
        {
          headers: { "X-aliyun-ecs-metadata-token-ttl-seconds": "3600" },
          timeout: 2 * 1000,
          responseType: "text",
          transformResponse: [(data) => data],
          validateStatus: () => true,
        },
      );
      // 非 200 先抛以保留状态码；200 但 body 非字符串属异常响应，
      // 抛错让失败指向 metadata 层
      if (resp.status !== 200) {
        throw new Error(`${resp.status} ${resp.statusText}`);
      }
      if (typeof resp.data !== "string") {
        throw new Error("response body is not a string");
      }
      token = resp.data;
    } catch (e) {
      throw new Error(`failed to get metadata token: ${(e as Error).message}`);
    }

    return token;
  }
}
