/**
 * KMS端点工具类
 */
export class KmsEndpointUtils {
  private constructor() {
    // do nothing
  }

  /**
   * 获取VPC端点
   * @param regionId 地域ID
   * @returns VPC端点
   */
  static getVPCEndpoint(regionId: string): string {
    return `kms-vpc.${regionId}.aliyuncs.com`;
  }

  /**
   * 获取KMS端点
   * @param regionId 地域ID
   * @returns KMS端点
   */
  static getEndPoint(regionId: string): string {
    return `kms.${regionId}.aliyuncs.com`;
  }
}
