/**
 * 退避策略接口
 */
export interface BackoffStrategy {
  /**
   * 初始化策略
   */
  init(): void;

  /**
   * 获取退避等待时间
   * @param retryTimes 退避重试次数
   * @returns 退避等待时间，时间单位MS
   */
  getWaitTimeExponential(retryTimes: number): number;
}
