import { SecretCacheClient } from "./SecretCacheClient";
import { CacheSecretStoreStrategy } from "./cache/CacheSecretStoreStrategy";
import { RefreshSecretStrategy } from "./service/RefreshSecretStrategy";
import { SecretCacheHook } from "./cache/SecretCacheHook";
import { MemoryCacheSecretStoreStrategy } from "./cache/MemoryCacheSecretStoreStrategy";
import { SecretManagerClient } from "./service/SecretManagerClient";
import { DefaultSecretCacheHook } from "./cache/DefaultSecretCacheHook";
import { DefaultRefreshSecretStrategy } from "./service/DefaultRefreshSecretStrategy";
import { CacheClientConstant } from "./utils/CacheClientConstant";
import { BaseSecretManagerClientBuilder } from "./service/BaseSecretManagerClientBuilder";
import { CacheClientBuilder } from "./CacheClientBuilder";
import { CommonLogger } from "./utils/CommonLogger";

/**
 * 凭据缓存客户端构建器
 */
export class SecretCacheClientBuilder implements CacheClientBuilder<
  Promise<SecretCacheClient>
> {
  private secretCacheClient!: SecretCacheClient;

  /**
   * 构建一个Secret Cache Client
   * @returns Secret Cache Client
   */
  static async newClient(): Promise<SecretCacheClient> {
    const builder = new SecretCacheClientBuilder();
    return await builder.build();
  }

  /**
   * 根据指定的Secret Manager Client构建一个Cache Client Builder
   * @param client 指定的Secret Manager Client
   * @returns Cache Client Builder
   */
  static newCacheClientBuilder(
    client: SecretManagerClient,
  ): SecretCacheClientBuilder {
    const builder = new SecretCacheClientBuilder();
    builder.buildSecretCacheClient();
    (builder.secretCacheClient as any).secretClient = client;
    return builder;
  }

  /**
   * 设定指定凭据名称的凭据TTL
   * @param secretName 指定凭据名称
   * @param ttl        凭据轮转周期，单位ms
   * @returns builder对象本身
   */
  withSecretTTL(secretName: string, ttl: number): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).secretTTLMap.set(secretName, ttl);
    return this;
  }

  /**
   * 设定secret value解析TTL字段名称
   * @param jsonTTLPropertyName secret value解析TTL字段名称
   * @returns builder对象本身
   */
  withParseJSONTTL(jsonTTLPropertyName: string): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).jsonTTLPropertyName = jsonTTLPropertyName;
    return this;
  }

  /**
   * 设定secret刷新策略
   * @param refreshSecretStrategy secret刷新策略
   * @returns builder对象本身
   */
  withRefreshSecretStrategy(
    refreshSecretStrategy: RefreshSecretStrategy,
  ): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).refreshSecretStrategy =
      refreshSecretStrategy;
    return this;
  }

  /**
   * 设定secret缓存策略
   * @param cacheSecretStrategy secret缓存策略
   * @returns builder对象本身
   */
  withCacheSecretStrategy(
    cacheSecretStrategy: CacheSecretStoreStrategy,
  ): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).cacheSecretStoreStrategy =
      cacheSecretStrategy;
    return this;
  }

  /**
   * 指定凭据Version Stage
   * @param stage 凭据Version Stage
   * @returns builder对象本身
   */
  withCacheStage(stage: string): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).stage = stage;
    return this;
  }

  /**
   * 指定凭据Cache Hook
   * @param hook 凭据Cache Hook
   * @returns builder对象本身
   */
  withSecretCacheHook(hook: SecretCacheHook): SecretCacheClientBuilder {
    this.buildSecretCacheClient();
    (this.secretCacheClient as any).cacheHook = hook;
    return this;
  }

  /**
   * 指定输出日志
   * @param logger 输出日志
   * @returns builder对象本身
   */
  withLogger(logger: Console): SecretCacheClientBuilder {
    CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, logger);
    return this;
  }

  /**
   * 构建Cache Client对象，同时对secretClient、cacheSecretStoreStrategy等组件进行初始化
   * @returns SecretCacheClient对象
   */
  async build(): Promise<SecretCacheClient> {
    this.buildSecretCacheClient();

    if (!CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
      CommonLogger.registerLogger(CacheClientConstant.MODE_NAME, console);
    }

    // 初始化各个组件
    if (!(this.secretCacheClient as any).secretClient) {
      (this.secretCacheClient as any).secretClient =
        BaseSecretManagerClientBuilder.standard().build();
    }
    if (!(this.secretCacheClient as any).cacheSecretStoreStrategy) {
      (this.secretCacheClient as any).cacheSecretStoreStrategy =
        new MemoryCacheSecretStoreStrategy();
    }
    if (!(this.secretCacheClient as any).refreshSecretStrategy) {
      (this.secretCacheClient as any).refreshSecretStrategy =
        new DefaultRefreshSecretStrategy(
          (this.secretCacheClient as any).jsonTTLPropertyName,
        );
    }
    if (!(this.secretCacheClient as any).cacheHook) {
      (this.secretCacheClient as any).cacheHook = new DefaultSecretCacheHook(
        (this.secretCacheClient as any).stage,
      );
    }

    await (this.secretCacheClient as any).init();
    CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).infof(
      "SecretCacheClientBuilder build success",
    );
    return this.secretCacheClient!;
  }

  private buildSecretCacheClient(): void {
    if (!this.secretCacheClient) {
      this.secretCacheClient = new SecretCacheClient();
    }
  }
}
