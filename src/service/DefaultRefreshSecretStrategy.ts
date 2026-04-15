import { RefreshSecretStrategy } from "./RefreshSecretStrategy";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";

/**
 * 默认刷新凭据策略
 */
export class DefaultRefreshSecretStrategy implements RefreshSecretStrategy {
  private readonly jsonTTLPropertyName: string;

  constructor(jsonTTLPropertyName?: string) {
    this.jsonTTLPropertyName = jsonTTLPropertyName || "";
  }

  async init(): Promise<void> {}
  getNextExecuteTime(
    _secretName: string,
    ttl: number,
    offsetTimestamp: number,
  ): number {
    const now = Date.now();
    if (ttl + offsetTimestamp > now) {
      return ttl + offsetTimestamp;
    } else {
      return now + ttl;
    }
  }

  parseNextExecuteTime(cacheSecretInfo: CacheSecretInfo): number {
    const secretInfo = cacheSecretInfo.getSecretInfo();
    const ttl = this.parseTTL(secretInfo);
    if (ttl <= 0) return ttl;
    return this.getNextExecuteTime(
      secretInfo.getSecretName(),
      ttl,
      cacheSecretInfo.getRefreshTimestamp(),
    );
  }

  parseTTL(secretInfo: SecretInfo): number {
    if (
      !this.jsonTTLPropertyName ||
      this.jsonTTLPropertyName.trim().length === 0
    ) {
      return -1;
    }

    try {
      const parsedValue: Record<string, any> = JSON.parse(
        secretInfo.getSecretValue(),
      );
      if (
        parsedValue === null ||
        parsedValue[this.jsonTTLPropertyName] === null
      ) {
        return -1;
      }

      const ttlValue = parsedValue[this.jsonTTLPropertyName];
      if (typeof ttlValue === "number") {
        return Math.round(ttlValue);
      } else {
        const numericValue = Number(ttlValue);
        if (isNaN(numericValue)) {
          return -1;
        }
        return Math.round(numericValue);
      }
    } catch (e) {
      return -1;
    }
  }

  close?(): void {}
}
