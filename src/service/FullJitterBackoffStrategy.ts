import { BackoffStrategy } from "./BackoffStrategy";
import { CacheClientConstant } from "../utils/CacheClientConstant";

/**
 * 全抖动退避策略
 */
export class FullJitterBackoffStrategy implements BackoffStrategy {
  /**
   * 重试最大尝试次数
   */
  private retryMaxAttempts: number | undefined;

  /**
   * 重试时间间隔，单位ms
   */
  private retryInitialIntervalMills: number | undefined;

  /**
   * 最大等待时间，单位ms
   */
  private capacity: number | undefined;

  constructor(
    retryMaxAttempts?: number,
    retryInitialIntervalMills?: number,
    capacity?: number,
  ) {
    this.retryMaxAttempts = retryMaxAttempts;
    this.retryInitialIntervalMills = retryInitialIntervalMills;
    this.capacity = capacity;
  }

  init(): void {
    this.retryMaxAttempts =
      this.retryMaxAttempts === undefined
        ? CacheClientConstant.DEFAULT_RETRY_MAX_ATTEMPTS
        : this.retryMaxAttempts;
    this.retryInitialIntervalMills =
      this.retryInitialIntervalMills === undefined
        ? CacheClientConstant.DEFAULT_RETRY_INITIAL_INTERVAL_MILLS
        : this.retryInitialIntervalMills;
    this.capacity =
      this.capacity === undefined
        ? CacheClientConstant.DEFAULT_CAPACITY
        : this.capacity;
  }

  /**
   * 获取指数退避时间
   * @param retryTimes 重试次数
   * @returns 退避时间（毫秒）
   */
  getWaitTimeExponential(retryTimes: number): number {
    if (
      retryTimes >
      (this.retryMaxAttempts ?? CacheClientConstant.DEFAULT_RETRY_MAX_ATTEMPTS)
    ) {
      return -1;
    }

    const calculatedDelay = Math.min(
      this.capacity ?? CacheClientConstant.DEFAULT_CAPACITY,
      Math.pow(2, retryTimes) *
        (this.retryInitialIntervalMills ??
          CacheClientConstant.DEFAULT_RETRY_INITIAL_INTERVAL_MILLS),
    );

    return Math.floor(Math.random() * calculatedDelay);
  }
}
