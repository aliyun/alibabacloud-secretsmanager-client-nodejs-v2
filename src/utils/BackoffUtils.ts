import { CacheClientConstant } from "./CacheClientConstant";

/**
 * 退避工具类
 */
export class BackoffUtils {
  /**
   * KMS限流返回错误码
   */
  private static readonly REJECTED_THROTTLING = "Rejected.Throttling";

  /**
   * KMS服务不可用返回错误码
   */
  private static readonly SERVICE_UNAVAILABLE_TEMPORARY =
    "ServiceUnavailableTemporary";

  /**
   * KMS服务内部错误返回错误码
   */
  private static readonly INTERNAL_FAILURE = "InternalFailure";

  private constructor() {
    // do nothing
  }

  /**
   * 根据Client异常判断是否进行规避重试
   * @param e 指定Client异常
   * @returns boolean
   */
  static judgeNeedBackoff(e: any): boolean {
    return !!(
      e &&
      e.code &&
      (e.code === BackoffUtils.REJECTED_THROTTLING ||
        e.code === BackoffUtils.SERVICE_UNAVAILABLE_TEMPORARY ||
        e.code === BackoffUtils.INTERNAL_FAILURE)
    );
  }

  /**
   * 根据Client异常判断是否进行容灾重试
   * @param e 指定Client异常
   * @returns boolean
   */
  static judgeNeedRecoveryException(e: any): boolean {
    if (e && typeof e.name === "string") {
      if (e.name === "ClientError") {
        return BackoffUtils.judgeNeedBackoff(e);
      }
      return (
        e.name === CacheClientConstant.SDK_READ_TIMEOUT ||
        e.code === CacheClientConstant.ECONNREFUSED_ERROR_CODE
      );
    }

    return false;
  }
}
