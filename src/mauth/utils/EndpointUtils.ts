import * as fs from "fs";

import { RegionInfo } from "../../model/RegionInfo";
import { CacheClientConstant } from "../../utils/CacheClientConstant";
import { KmsEndpointUtils } from "../../utils/KmsEndpointUtils";
import { PrivateCaUtils } from "../../utils/PrivateCaUtils";

/**
 * KMS endpoint 与 CA 推导工具。
 *
 * builder 装配 MAuth、SecretManagerClientWithBearer 直连取数共用这一套规则；
 * 单独成模块是为了让 MAuth 的静态工厂能复用它，同时避免 MAuth 反向依赖
 * service 层（SecretManagerClientWithBearer 依赖 MAuth）造成循环引用。
 */
export class EndpointUtils {
  private constructor() {
    // do nothing
  }

  /**
   * 解析地域对应的 KMS endpoint
   * @param regionInfo 地域信息
   */
  static resolveEndpoint(regionInfo: RegionInfo): string {
    if (regionInfo.getEndpoint()) {
      return regionInfo.getEndpoint()!;
    } else if (regionInfo.getVpc()) {
      return KmsEndpointUtils.getVPCEndpoint(regionInfo.getRegionId());
    }
    return KmsEndpointUtils.getEndPoint(regionInfo.getRegionId());
  }

  /**
   * 解析地域对应的 CA 证书内容
   * @param regionInfo 地域信息
   */
  static resolveCa(regionInfo: RegionInfo): string {
    if (regionInfo.getCaFilePath()) {
      return fs.readFileSync(regionInfo.getCaFilePath()!, "utf-8");
    }
    const caContent = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(
      regionInfo.getRegionId(),
    );
    if (!caContent) {
      throw new Error(
        `cannot find the built-in ca certificate for region[${regionInfo.getRegionId()}], please provide the caFilePath parameter`,
      );
    }
    return caContent;
  }

  /**
   * 解析地域对应的 endpoint 与 CA（实例网关域名才需要 CA）
   * @param regionInfo 地域信息
   */
  static resolveEndpointAndCa(regionInfo: RegionInfo): {
    endpoint: string;
    ca?: string;
  } {
    const endpoint = EndpointUtils.resolveEndpoint(regionInfo);
    let ca: string | undefined;
    if (endpoint.endsWith(CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX)) {
      ca = EndpointUtils.resolveCa(regionInfo);
    }
    return { endpoint, ca };
  }
}