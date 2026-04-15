import { SecretInfo } from "./model/SecretInfo";
import { CacheSecretException } from "./exception/CacheSecretException";
import { CacheSecretStoreStrategy } from "./cache/CacheSecretStoreStrategy";
import { RefreshSecretStrategy } from "./service/RefreshSecretStrategy";
import { SecretManagerClient } from "./service/SecretManagerClient";
import { SecretCacheHook } from "./cache/SecretCacheHook";
import { CacheSecretInfo } from "./model/CacheSecretInfo";
import { CacheClientConstant } from "./utils/CacheClientConstant";
import { BackoffUtils } from "./utils/BackoffUtils";
import { CommonLogger } from "./utils/CommonLogger";
import {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "@alicloud/kms20160120";

/**
 * 凭据缓存客户端
 */
export class SecretCacheClient {
  private static readonly DEFAULT_TTL = 60 * 60 * 1000;

  private scheduledThreadPoolExecutor: any;
  private scheduledFutureMap = new Map<string, any>();
  private nextExecuteTimeMap = new Map<string, number>();

  /**
   * 凭据Version Stage
   */
  protected stage: string = CacheClientConstant.STAGE_ACS_CURRENT;

  /**
   * secret value解析TTL字段名称
   */
  protected jsonTTLPropertyName: string = "ttl";

  protected secretClient: SecretManagerClient | undefined;
  protected cacheSecretStoreStrategy?: CacheSecretStoreStrategy;
  protected refreshSecretStrategy?: RefreshSecretStrategy | undefined;
  protected cacheHook?: SecretCacheHook;
  protected secretTTLMap: Map<string, number> = new Map();
  private monitorThread: any;

  constructor(
    secretClient?: SecretManagerClient,
    cacheSecretStoreStrategy?: CacheSecretStoreStrategy,
    refreshSecretStrategy?: RefreshSecretStrategy,
    cacheHook?: SecretCacheHook,
  ) {
    this.secretClient = secretClient;
    this.cacheSecretStoreStrategy = cacheSecretStoreStrategy;
    this.refreshSecretStrategy = refreshSecretStrategy;
    this.cacheHook = cacheHook;
    this.scheduledThreadPoolExecutor = {
      schedule: (task: () => void, delay: number) => {
        return setTimeout(task, delay);
      },
      remove: (task: any) => {
        clearTimeout(task);
      },
      shutdownNow: () => {
        for (const task of this.scheduledFutureMap.values()) {
          clearTimeout(task);
        }
        this.scheduledFutureMap.clear();
      },
      isShutdown: () => false,
    };
  }

  /**
   * 根据凭据名称获取secretInfo信息
   * @param secretName 指定的凭据名称
   * @returns secretInfo信息
   */
  async getSecretInfo(secretName: string): Promise<SecretInfo> {
    if (!secretName || secretName.trim() === "") {
      throw new Error("the argument[secretName] must not be null");
    }

    return await this.withLock(secretName, async () => {
      let cacheSecretInfo =
        this.cacheSecretStoreStrategy?.getCacheSecretInfo(secretName);

      if (
        cacheSecretInfo &&
        this.checkCacheSecretInfoIsValid(cacheSecretInfo)
      ) {
        if (this.cacheHook) {
          return this.cacheHook.get(cacheSecretInfo);
        } else {
          return cacheSecretInfo.getSecretInfo();
        }
      } else {
        cacheSecretInfo =
          this.cacheSecretStoreStrategy?.getCacheSecretInfo(secretName);
        if (
          cacheSecretInfo &&
          this.checkCacheSecretInfoIsValid(cacheSecretInfo)
        ) {
          if (this.cacheHook) {
            return this.cacheHook.get(cacheSecretInfo);
          } else {
            return cacheSecretInfo.getSecretInfo();
          }
        } else {
          const secretInfo = await this.getSecretValue(secretName);
          await this.storeAndRefresh(secretName, secretInfo);

          if (this.cacheHook) {
            const cacheSecret = await this.cacheHook.put(secretInfo);
            if (cacheSecret) {
              return cacheSecret.getSecretInfo();
            }
          }
          return secretInfo;
        }
      }
    });
  }

  /**
   * 根据凭据名称获取凭据存储值文本信息
   * @param secretName 指定的凭据名称
   * @returns 凭据存储值文本信息
   */
  async getStringValue(secretName: string): Promise<string> {
    const secretInfo = await this.getSecretInfo(secretName);
    if (!secretInfo) {
      return "";
    }
    const secretDataType = secretInfo.getSecretDataType();
    if (
      secretDataType &&
      secretDataType !== CacheClientConstant.TEXT_DATA_TYPE
    ) {
      throw new Error(
        `the secret named[${secretName}] do not support text value`,
      );
    }
    let secretValue = secretInfo.getSecretValue();
    if (!secretValue) {
      return "";
    }
    return secretValue;
  }

  /**
   * 根据凭据名称获取凭据存储的二进制信息
   * @param secretName 指定的凭据名称
   * @returns 凭据存储值二进制信息
   */
  async getBinaryValue(secretName: string): Promise<Buffer> {
    const secretInfo = await this.getSecretInfo(secretName);
    if (!secretInfo) {
      return Buffer.alloc(0);
    }
    const secretDataType = secretInfo.getSecretDataType();
    if (
      secretDataType &&
      secretDataType !== CacheClientConstant.BINARY_DATA_TYPE
    ) {
      throw new CacheSecretException(
        `the secret named[${secretName}] do not support binary value`,
      );
    }
    const secretValue = secretInfo.getSecretValue()!;
    return Buffer.from(secretValue, CacheClientConstant.UTF8_ENCODING);
  }

  /**
   * 强制刷新指定的凭据名称
   * @param secretName 指定的凭据名称
   * @returns 刷新是否成功
   */
  async refreshNow(secretName: string): Promise<boolean> {
    if (!secretName || secretName.trim() === "") {
      throw new Error("the argument[secretName] must not be null");
    }
    return await this.refreshNowInternal(secretName, undefined);
  }

  private async refreshNowInternal(
    secretName: string,
    secretInfo?: SecretInfo,
  ): Promise<boolean> {
    let executeResult = true;

    return await this.withLock(secretName, async () => {
      try {
        await this.refresh(secretName, secretInfo);
      } catch (e) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:refresh %s, stack: %s",
          e,
          (e as Error).stack,
        );
        executeResult = false;
      }

      try {
        await this.removeRefreshTask(secretName);
      } catch (e) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:removeRefreshTask %s, stack: %s",
          e,
          (e as Error).stack,
        );
        executeResult = false;
      }

      try {
        await this.addRefreshTask(
          secretName,
          new RefreshSecretTask(this, secretName),
        );
      } catch (e) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:addRefreshTask %s, stack: %s",
          e,
          (e as Error).stack,
        );
        executeResult = false;
      }

      return executeResult;
    });
  }

  protected async init(): Promise<void> {
    if (this.secretClient) {
      await this.secretClient.init();
    }
    if (this.cacheSecretStoreStrategy) {
      await this.cacheSecretStoreStrategy.init();
    }
    if (this.refreshSecretStrategy) {
      await this.refreshSecretStrategy.init();
    }
    if (this.cacheHook) {
      await this.cacheHook.init();
    }

    for (const [secretName] of this.secretTTLMap) {
      let secretInfo = undefined;
      try {
        secretInfo = await this.getSecretValue(secretName);
      } catch (e) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:initSecretCacheClient %s, stack: %s",
          e,
          (e as Error).stack,
        );
        if (this.judgeSkipRefreshException(e)) {
          throw e;
        }
      }
      if (secretInfo) {
        await this.withLock(secretName, async () => {
          await this.internalRefreshOperations(secretName, secretInfo);
        });
      }
    }

    CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).infof(
      "secretCacheClient init success",
    );
  }

  private judgeCacheExpire(cacheSecretInfo: CacheSecretInfo): boolean {
    let ttl = 0;
    if (this.refreshSecretStrategy) {
      ttl = this.refreshSecretStrategy.parseTTL(
        cacheSecretInfo.getSecretInfo(),
      );
    }
    if (ttl <= 0) {
      const secretName = cacheSecretInfo.getSecretInfo().getSecretName();
      if (secretName != null) {
        ttl =
          this.secretTTLMap.get(secretName) || SecretCacheClient.DEFAULT_TTL;
      }
    }
    return Date.now() - cacheSecretInfo.getRefreshTimestamp() > ttl;
  }

  private async getSecretValue(secretName: string): Promise<SecretInfo> {
    try {
      let request: GetSecretValueRequest = new GetSecretValueRequest({
        secretName: secretName,
        versionStage: this.stage,
        fetchExtendedConfig: true,
      });

      const response: GetSecretValueResponse =
        await this.secretClient?.getSecretValue(request)!;

      return new SecretInfo(
        response?.body?.secretName!,
        response?.body?.versionId!,
        response?.body?.secretData!,
        response?.body?.secretDataType,
        response?.body?.createTime,
        response?.body?.secretType,
        response?.body?.automaticRotation,
        response?.body?.extendedConfig,
        response?.body?.rotationInterval,
        response?.body?.nextRotationDate,
      );
    } catch (error) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:getSecretValue %s, stack: %s",
        error,
        (error as Error).stack,
      );
      if (!BackoffUtils.judgeNeedRecoveryException(error)) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new CacheSecretException(errorMessage, error);
      }
      try {
        let secretInfo: SecretInfo | undefined;
        if (this.cacheHook) {
          secretInfo = await this.cacheHook.recoveryGetSecret(secretName);
        }
        if (secretInfo) {
          return secretInfo;
        } else {
          throw error;
        }
      } catch (ce) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:getSecretValue %s, stack: %s",
          error,
          (error as Error).stack,
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new CacheSecretException(errorMessage, error);
      }
    }
  }

  private async storeAndRefresh(
    secretName: string,
    secretInfo: SecretInfo,
  ): Promise<void> {
    try {
      await this.internalRefreshOperations(secretName, secretInfo);
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:refresh %s, stack: %s",
        e,
        (e as Error).stack,
      );
      // 此异常忽略不阻碍用户流程
    }
  }

  private async internalRefreshOperations(
    secretName: string,
    secretInfo: SecretInfo,
  ): Promise<void> {
    await this.refresh(secretName, secretInfo);

    await this.removeRefreshTask(secretName);

    await this.addRefreshTask(
      secretName,
      new RefreshSecretTask(this, secretName),
    );
  }

  private async refresh(
    secretName: string,
    secretInfo?: SecretInfo,
  ): Promise<void> {
    if (!secretInfo) {
      secretInfo = await this.getSecretValue(secretName);
    }

    let cacheSecretInfo = undefined;
    if (this.cacheHook) {
      cacheSecretInfo = await this.cacheHook.put(secretInfo);
    }

    if (cacheSecretInfo && this.cacheSecretStoreStrategy) {
      await this.cacheSecretStoreStrategy.storeSecret(cacheSecretInfo);
    }

    CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).infof(
      "secretName:%s refresh success current versionId:%s",
      secretName,
      secretInfo.getVersionId(),
    );
  }

  private async addRefreshTask(
    secretName: string,
    runnable: any,
  ): Promise<void> {
    if (!this.cacheSecretStoreStrategy) {
      throw new CacheSecretException(
        "Cache strategy is not initialized",
        "CACHE_STRATEGY_NOT_INITIALIZED",
      );
    }

    const cacheSecretInfo =
      this.cacheSecretStoreStrategy.getCacheSecretInfo(secretName);
    let executeTime = 0;
    if (this.refreshSecretStrategy && cacheSecretInfo) {
      executeTime =
        this.refreshSecretStrategy.parseNextExecuteTime(cacheSecretInfo);
    }

    if (executeTime <= 0) {
      const refreshTimestamp = cacheSecretInfo?.getRefreshTimestamp() || 0;
      const ttl =
        this.secretTTLMap.get(secretName) || SecretCacheClient.DEFAULT_TTL;
      if (this.refreshSecretStrategy) {
        executeTime = this.refreshSecretStrategy.getNextExecuteTime(
          secretName,
          ttl,
          refreshTimestamp,
        );
      } else {
        executeTime = Date.now() + ttl;
      }
      executeTime = Math.max(executeTime, Date.now());
    }

    this.nextExecuteTimeMap.set(secretName, executeTime);

    const delay = executeTime - Date.now();
    const scheduledTask = this.scheduledThreadPoolExecutor.schedule(() => {
      runnable.run();
    }, delay);

    this.scheduledFutureMap.set(secretName, scheduledTask);

    CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).infof(
      "secretName:%s addRefreshTask success",
      secretName,
    );
  }

  private async removeRefreshTask(secretName: string): Promise<void> {
    const task = this.scheduledFutureMap.get(secretName);
    if (task) {
      this.scheduledThreadPoolExecutor.remove(task);
      this.scheduledFutureMap.delete(secretName);
    }
  }

  private checkCacheSecretInfoIsValid(
    cacheSecretInfo: CacheSecretInfo,
  ): boolean {
    if (cacheSecretInfo && !this.judgeCacheExpire(cacheSecretInfo)) {
      return this.checkSecretValueIsEmpty(cacheSecretInfo);
    }
    return false;
  }

  private checkSecretValueIsEmpty(cacheSecretInfo: CacheSecretInfo): boolean {
    if (cacheSecretInfo) {
      const secretInfo = cacheSecretInfo.getSecretInfo();
      if (secretInfo) {
        const secretValue = secretInfo.getSecretValue();
        if (secretValue && secretValue.trim() !== "") {
          return true;
        }
      }
    }
    return false;
  }

  private judgeSkipRefreshException(e: any): boolean {
    if (e && e.getCause && typeof e.getCause === "function") {
      const cause = e.getCause();
      if (cause && cause.code !== undefined) {
        return (
          !this.judgeServerException(cause) &&
          !(
            CacheClientConstant.CLIENT_ERROR_CODE_FORBIDDEN_IN_DEBT_OVER_DUE ===
              cause.code ||
            CacheClientConstant.CLIENT_ERROR_CODE_FORBIDDEN_IN_DEBT ===
              cause.code
          )
        );
      }
    }
    return true;
  }

  private judgeServerException(e: any): boolean {
    return BackoffUtils.judgeNeedBackoff(e);
  }

  private locks: Map<string, Promise<any>> = new Map();

  private async withLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(lockKey);

    const newLock = (async () => {
      if (currentLock) {
        await currentLock;
      }
      return await fn();
    })();

    this.locks.set(lockKey, newLock);

    return await newLock;
  }

  /**
   * 关闭客户端资源
   */
  async close(): Promise<void> {
    if (this.cacheSecretStoreStrategy) {
      this.cacheSecretStoreStrategy.close();
    }
    if (this.refreshSecretStrategy) {
      this.refreshSecretStrategy.close?.();
    }
    if (this.secretClient) {
      this.secretClient.close();
    }
    if (this.cacheHook) {
      this.cacheHook.close();
    }

    if (!this.scheduledThreadPoolExecutor.isShutdown()) {
      this.scheduledThreadPoolExecutor.shutdownNow();
    }
    if (
      this.monitorThread &&
      typeof this.monitorThread.interrupt === "function"
    ) {
      this.monitorThread.interrupt();
    }
  }
}

class RefreshSecretTask {
  private readonly secretCacheClient: SecretCacheClient;
  private readonly secretName: string;

  constructor(secretCacheClient: SecretCacheClient, secretName: string) {
    this.secretCacheClient = secretCacheClient;
    this.secretName = secretName;
  }

  async run(): Promise<void> {
    try {
      if (this.secretCacheClient) {
        await this.secretCacheClient["refresh"](this.secretName, undefined);
      }
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:refreshSecretTask %s, stack: %s",
        e,
        (e as Error).stack,
      );
    }
    try {
      if (this.secretCacheClient) {
        await this.secretCacheClient["addRefreshTask"](this.secretName, this);
      }
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:addRefreshTask %s, stack: %s",
        e,
        (e as Error).stack,
      );
    }
  }
}
