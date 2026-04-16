import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";

/**
 * 刷新凭据策略接口
 */
export interface RefreshSecretStrategy {
  /**
   * 初始化方法
   */
  init(): Promise<void>;

  /**
   * 获取下一次secret刷新执行的时间
   * @param secretName 指定secret名称
   * @param ttl 轮转时间间隔
   * @param offsetTimestamp 上一次secret刷新时间
   * @returns 下一次执行时间
   */
  getNextExecuteTime(
    secretName: string,
    ttl: number,
    offsetTimestamp: number,
  ): number;

  /**
   * 通过secret信息解析下一次secret刷新执行的时间
   * @param cacheSecretInfo secret信息
   * @returns 下一次secret刷新执行的时间
   */
  parseNextExecuteTime(cacheSecretInfo: CacheSecretInfo): number;

  /**
   * 解析TTL
   * @param secretInfo 凭据信息
   * @returns TTL值（毫秒）
   */
  parseTTL(secretInfo: SecretInfo): number;

  /**
   * 关闭资源
   */
  close?(): void;
}
