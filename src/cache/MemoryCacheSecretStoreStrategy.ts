import { CacheSecretStoreStrategy } from "./CacheSecretStoreStrategy";
import { CacheSecretInfo } from "../model/CacheSecretInfo";

/**
 * 内存缓存凭据存储策略
 */
export class MemoryCacheSecretStoreStrategy implements CacheSecretStoreStrategy {
  private cache: Map<string, CacheSecretInfo> = new Map();

  async init(): Promise<void> {}

  getCacheSecretInfo(secretName: string): CacheSecretInfo | undefined {
    return this.cache.get(secretName);
  }

  async storeSecret(cacheSecretInfo: CacheSecretInfo): Promise<void> {
    const secretName = cacheSecretInfo.getSecretInfo().getSecretName();
    this.cache.set(secretName, cacheSecretInfo);
  }

  close(): void {
    this.cache.clear();
  }
}
