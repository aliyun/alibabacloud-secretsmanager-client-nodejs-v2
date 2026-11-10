import Kms20160120, {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "@alicloud/kms20160120";
import { $OpenApiUtil } from "@alicloud/openapi-core";
import * as $dara from "@darabonba/typescript";
import { MAuth } from "../mauth/MAuth";
import { EndpointUtils } from "../mauth/utils/EndpointUtils";
import { RegionInfo } from "../model/RegionInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { ActionGetSecretValue, extractSignParams, sign } from "../utils/Sign";

/**
 * secretManagerClientWithBearer 负责 bearer 签名方式的单次凭据获取
 */
export class SecretManagerClientWithBearer {
  private readonly mauth: MAuth;

  constructor(mauth: MAuth) {
    this.mauth = mauth;
  }

  /**
   * 关闭内部的 MAuth
   */
  close(): void {
    this.mauth.close();
  }

  async getSecretValue(
    regionInfo: RegionInfo,
    req: GetSecretValueRequest,
  ): Promise<GetSecretValueResponse> {
    try {
      return await this.doGetSecretValueWithBearer(regionInfo, req);
    } catch (e) {
      if (
        (e as any)?.code ===
        CacheClientConstant.ERROR_CODE_INVALID_ACCESS_KEY_ID_NOT_FOUND
      ) {
        this.mauth.clearToken();
        return await this.doGetSecretValueWithBearer(regionInfo, req);
      }
      throw e;
    }
  }

  private async doGetSecretValueWithBearer(
    regionInfo: RegionInfo,
    req: GetSecretValueRequest,
  ): Promise<GetSecretValueResponse> {
    // 1. 获取认证令牌
    let token;
    try {
      token = await this.mauth.getToken();
    } catch (e) {
      throw new Error(`get token error: ${(e as Error).message}`);
    }

    // 2. 构建签名参数，进行签名
    const { queryParams, header } = extractSignParams(
      req,
      token.tokenKeyId,
      ActionGetSecretValue,
    );
    let signature: string;
    try {
      signature = sign(queryParams, header, token.tokenValue);
    } catch (e) {
      throw new Error(`sign error: ${(e as Error).message}`);
    }

    // 3. 复制配置并添加签名信息
    const config = new $OpenApiUtil.Config({});
    const endpoint = EndpointUtils.resolveEndpoint(regionInfo);
    config.endpoint = endpoint;
    if (
      endpoint.endsWith(CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX)
    ) {
      config.ca = EndpointUtils.resolveCa(regionInfo);
    }
    config.protocol = CacheClientConstant.DEFAULT_PROTOCOL;
    config.bearerToken = signature;

    let kmsClient: Kms20160120;
    try {
      kmsClient = new Kms20160120(config);
    } catch (e) {
      throw new Error(`failed to create sm client: ${(e as Error).message}`);
    }

    // 把签名 header 加到请求里：Node 侧经
    // RuntimeOptions.extendsParameters.headers 合并进请求头
    const runtime = new $dara.RuntimeOptions({});
    runtime.extendsParameters = new $dara.ExtendsParameters({
      headers: header,
    });
    return await kmsClient.getSecretValueWithOptions(req, runtime);
  }
}
