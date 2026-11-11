import OpenApi, { $OpenApiUtil } from "@alicloud/openapi-core";
import * as $dara from "@darabonba/typescript";
import { Exchanger, ExchangeResult } from "./Exchanger";

/**
 * 临时凭据返回结构
 */
export interface TemporaryCredential {
  CredentialType?: string;
  Credential?: string;
  ExpiredAt?: string;
  Region?: string;
  RequestId?: string;
}

export const ActionIssueTemporaryCredential = "IssueTemporaryCredential";
export const AapArnQueryKey = "AapArn";

/**
 * KMS 凭据置换器：使用身份令牌调用 IssueTemporaryCredential 置换临时 ClientKey 凭据
 */
export class KmsExchanger implements Exchanger {
  private kmsEndpoint: string;
  private aapArn?: string;
  private ca?: string;

  constructor(kmsEndpoint: string, aapArn?: string, ca?: string) {
    this.kmsEndpoint = kmsEndpoint;
    this.aapArn = aapArn;
    this.ca = ca;
  }

  async exchangeCredential(
    bearerToken: string,
    aapArn?: string,
  ): Promise<ExchangeResult> {
    const config = new $OpenApiUtil.Config({
      endpoint: this.kmsEndpoint,
      readTimeout: 3 * 1000,
      connectTimeout: 3 * 1000,
      protocol: "https",
      // bearerToken 非空时客户端自动创建 bearer 类型凭据
      bearerToken: bearerToken,
    });
    if (this.ca) {
      config.ca = this.ca;
    }
    let client: OpenApi;
    try {
      client = new OpenApi(config);
    } catch (e) {
      throw new Error(`failed to create client: ${(e as Error).message}`);
    }
    const params = new $OpenApiUtil.Params({
      // 设置API的行动、版本和其他必要参数
      action: ActionIssueTemporaryCredential, // API名称
      version: "2016-01-20", // API版本号
      protocol: "HTTPS", // 请求协议：HTTPS或HTTP，建议使用HTTPS。
      method: "POST", // 请求方法
      authType: "bearer", // 认证类型，默认即可。当OpenAPI支持匿名请求时，您可以传入 Anonymous 发起匿名请求。
      style: "RPC", // API风格：RPC、ROA
      pathname: "/", // 接口 PATH，RPC接口默认"/"
      reqBodyType: "json", // 接口请求体内容格式。
      bodyType: "json", // 接口响应体内容格式。
    });

    // 设置查询参数（aapArn 覆盖值优先，缺省回退实例配置，与 MAuth.resolveAapArn 同规则）
    const effectiveAapArn = aapArn || this.aapArn || "";

    const query: { [key: string]: string } = {
      [AapArnQueryKey]: effectiveAapArn,
    };
    // 设置运行时选项
    const runtime = new $dara.RuntimeOptions();
    // 创建API请求并设置参数，并添加请求头
    const request = new $OpenApiUtil.OpenApiRequest({
      query: query,
      headers: {
        "X-Acs-Bearer-Token": bearerToken,
      },
    });

    // 调用API并处理返回结果
    let response: { [key: string]: any };
    try {
      response = await client.callApi(params, request, runtime);
    } catch (e) {
      throw new Error(`failed to call api: ${(e as Error).message}`);
    }
    // 返回值为Map类型，可从Map中获得三类数据：body、headers、HTTP返回的状态码 statusCode。
    // body 已是 SDK 解析好的普通 JSON 对象，直接类型收窄即可
    const ret = (response["body"] ?? {}) as TemporaryCredential;

    return {
      tokenType: ret.CredentialType ?? "",
      tokenValue: ret.Credential ?? "",
    };
  }
}
