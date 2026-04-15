import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";

/**
 * 凭据缓存钩子接口
 */
export interface SecretCacheHook {
  /**
   * 初始化
   */
  init(): Promise<void>;

  /**
   * 获取缓存的凭据信息
   * @param cacheSecretInfo 缓存的凭据信息
   * @returns 凭据信息
   */
  get(cacheSecretInfo: CacheSecretInfo): Promise<SecretInfo>;

  /**
   * 存储凭据信息到缓存
   * @param secretInfo 凭据信息
   * @returns 缓存的凭据信息
   */
  put(secretInfo: SecretInfo): Promise<CacheSecretInfo>;

  /**
   * 恢复获取凭据
   * @param secretName 凭据名称
   * @returns 凭据信息
   */
  recoveryGetSecret(secretName: string): Promise<SecretInfo | undefined>;

  /**
   * 关闭资源
   */
  close(): void;
}
