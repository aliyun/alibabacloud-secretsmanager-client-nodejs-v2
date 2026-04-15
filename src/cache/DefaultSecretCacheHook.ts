import { SecretCacheHook } from "./SecretCacheHook";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";

/**
 * 默认凭据缓存钩子实现
 */
export class DefaultSecretCacheHook implements SecretCacheHook {
  private readonly stage: string;

  constructor(stage: string) {
    this.stage = stage;
  }

  async init(): Promise<void> {
    // 初始化操作
  }

  async get(cacheSecretInfo: CacheSecretInfo): Promise<SecretInfo> {
    return cacheSecretInfo.getSecretInfo();
  }

  async put(secretInfo: SecretInfo): Promise<CacheSecretInfo> {
    return new CacheSecretInfo(secretInfo, this.stage, Date.now());
  }
  async recoveryGetSecret(
    _secretName: string,
  ): Promise<SecretInfo | undefined> {
    return undefined;
  }

  close(): void {
    // 关闭资源
  }
}
