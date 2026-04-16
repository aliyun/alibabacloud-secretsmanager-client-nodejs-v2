import { SecretInfo } from "./SecretInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";

/**
 * 缓存凭据信息模型
 */
export class CacheSecretInfo {
  private secretInfo: SecretInfo;
  private stage: string;
  private refreshTimestamp: number;

  constructor(
    secretInfo: SecretInfo,
    stage?: string,
    refreshTimestamp?: number,
  ) {
    this.secretInfo = secretInfo;
    this.stage = stage || CacheClientConstant.STAGE_ACS_CURRENT;
    this.refreshTimestamp = refreshTimestamp || Date.now();
  }

  getSecretInfo(): SecretInfo {
    return this.secretInfo;
  }

  setSecretInfo(secretInfo: SecretInfo): CacheSecretInfo {
    this.secretInfo = secretInfo;
    return this;
  }

  getStage(): string {
    return this.stage;
  }

  setStage(stage: string): CacheSecretInfo {
    this.stage = stage;
    return this;
  }

  getRefreshTimestamp(): number {
    return this.refreshTimestamp;
  }

  setRefreshTimestamp(timestamp: number): CacheSecretInfo {
    this.refreshTimestamp = timestamp;
    return this;
  }

  /**
   * 克隆CacheSecretInfo对象
   * @returns 克隆的对象
   */
  clone(): CacheSecretInfo {
    const clonedSecretInfo = this.secretInfo.clone();
    return new CacheSecretInfo(
      clonedSecretInfo,
      this.stage,
      this.refreshTimestamp,
    );
  }
}
