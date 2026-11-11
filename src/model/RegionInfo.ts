/**
 * 地域信息模型
 */
export class RegionInfo {
  private regionId: string;
  private endpoint?: string;
  private vpc?: boolean;
  private caFilePath?: string;

  /**
   * @param regionId 地域 ID；缺省为空串，
   *                 可先无参构造再经 setRegionId 补值；build 时由
   *                 checkRegionInfo 校验空值并抛错
   */
  constructor(
    regionId: string = "",
    endpoint?: string,
    vpc?: boolean,
    caFilePath?: string,
  ) {
    this.regionId = regionId;
    this.endpoint = endpoint;
    this.vpc = vpc;
    this.caFilePath = caFilePath;
  }

  getRegionId(): string {
    return this.regionId;
  }

  setRegionId(regionId: string): void {
    this.regionId = regionId;
  }

  getEndpoint(): string | undefined {
    return this.endpoint;
  }

  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  getVpc(): boolean | undefined {
    return this.vpc;
  }

  setVpc(vpc: boolean): void {
    this.vpc = vpc;
  }

  getCaFilePath(): string | undefined {
    return this.caFilePath;
  }

  setCaFilePath(caFilePath: string): void {
    this.caFilePath = caFilePath;
  }
}
