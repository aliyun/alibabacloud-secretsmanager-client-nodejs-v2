import { CacheSecretInfo } from "../model/CacheSecretInfo";

/**
 * 缓存secret策略接口
 */
export interface CacheSecretStoreStrategy {
  /**
   * 初始化凭据缓存
   */
  init(): Promise<void>;

  /**
   * 缓存secret信息
   * @param cacheSecretInfo 指定缓存secret信息
   */
  storeSecret(cacheSecretInfo: CacheSecretInfo): Promise<void>;

  /**
   * 获取secret缓存信息
   * @param secretName 指定缓存secret名称
   * @returns 缓存secret信息
   */
  getCacheSecretInfo(secretName: string): CacheSecretInfo | undefined;

  /**
   * 关闭资源
   */
  close(): void;
}
