import { BaseSecretManagerClientBuilder } from "./BaseSecretManagerClientBuilder";
import { SecretManagerClient } from "./SecretManagerClient";
import { RegionInfo } from "../model/RegionInfo";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { CredentialsProviderUtils } from "../utils/CredentialsProviderUtils";
import { CommonLogger } from "../utils/CommonLogger";
import { BackoffStrategy } from "./BackoffStrategy";
import {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "@alicloud/kms20160120";
import Kms20160120 from "@alicloud/kms20160120";
import { KmsEndpointUtils } from "../utils/KmsEndpointUtils";
import { PrivateCaUtils } from "../utils/PrivateCaUtils";
import { UserAgentManager } from "./UserAgentManager";
import { BackoffUtils } from "../utils/BackoffUtils";
import { Config } from "@alicloud/openapi-client";
import Credential, { DefaultCredentialsProvider } from "@alicloud/credentials";
import { PingUtils } from "../utils/PingUtils";
import { CredentialsPropertiesUtils } from "../utils/CredentialsPropertiesUtils";
import { FullJitterBackoffStrategy } from "./FullJitterBackoffStrategy";
import { AlibabaCloudError } from "@alicloud/openapi-core";
import * as credentials from "@alicloud/credentials";
import { MAuth } from "../mauth/MAuth";
import {
  ACKOidcJwt,
  AuthConfig,
  ClientKey,
  ECSInstanceIdentity,
} from "../mauth/config/Config";
import { SecretManagerClientWithBearer } from "./SecretManagerClientBearer";
/**
 * 默认Secret Manager客户端构建器
 */
export class DefaultSecretManagerClientBuilder extends BaseSecretManagerClientBuilder {
  private regionInfos: RegionInfo[] = [];
  private configMap: Map<RegionInfo, Config> = new Map();
  private provider!: credentials.CredentialsProvider;
  private backoffStrategy?: BackoffStrategy;
  private customConfigFile?: string;
  private mauthConfig?: AuthConfig; // mauth认证配置

  /**
   * 设置访问阿里云的AccessKey
   * @param accessKeyId AccessKey ID
   * @param accessKeySecret AccessKey Secret
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withAccessKey(
    accessKeyId: string,
    accessKeySecret: string,
  ): DefaultSecretManagerClientBuilder {
    this.provider = CredentialsProviderUtils.withAccessKey(
      accessKeyId,
      accessKeySecret,
    );
    return this;
  }

  /**
   * 设置凭证
   * @param provider 凭证
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withCredentialsProvider(
    provider: credentials.CredentialsProvider,
  ): DefaultSecretManagerClientBuilder {
    this.provider = provider;
    return this;
  }

  /**
   * 指定调用地域Id
   * @param regionId 调用地域Id
   * @returns DefaultSecretManagerClientBuilder实例
   */
  addRegion(regionId: string): DefaultSecretManagerClientBuilder {
    return this.addRegionInfo(new RegionInfo(regionId));
  }

  /**
   * 指定调用地域信息
   * @param regionInfo 调用地域信息
   * @returns DefaultSecretManagerClientBuilder实例
   */
  addRegionInfo(regionInfo: RegionInfo): DefaultSecretManagerClientBuilder {
    this.regionInfos.push(regionInfo);
    return this;
  }
  /**
   * 指定多个调用地域Id
   * @param regionIds 多个调用地域Id
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withRegion(...regionIds: string[]): DefaultSecretManagerClientBuilder {
    for (const regionId of regionIds) {
      this.addRegion(regionId);
    }
    return this;
  }

  /**
   * 设置退避策略
   * @param backoffStrategy 退避策略
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withBackoffStrategy(
    backoffStrategy: BackoffStrategy,
  ): DefaultSecretManagerClientBuilder {
    this.backoffStrategy = backoffStrategy;
    return this;
  }

  /**
   * 添加配置信息
   * @param config 配置信息
   * @returns DefaultSecretManagerClientBuilder实例
   */
  addConfig(config: Config): DefaultSecretManagerClientBuilder {
    if (!config.regionId) {
      throw new Error("regionId is required");
    }
    const regionInfo = new RegionInfo(config.regionId, config.endpoint);
    this.configMap.set(regionInfo, config);
    this.regionInfos.push(regionInfo);
    return this;
  }

  /**
   * 设置自定义配置文件
   * @param customConfigFile 自定义配置文件路径
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withCustomConfigFile(
    customConfigFile: string,
  ): DefaultSecretManagerClientBuilder {
    this.customConfigFile = customConfigFile;
    return this;
  }

  /**
   * 使用ClientKey配置认证信息
   * @param clientKeyConfigPath 客户端密钥配置文件路径
   * @param clientKeyPasswordPath 客户端密钥密码文件路径
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withClientKey(
    clientKeyConfigPath: string,
    clientKeyPasswordPath: string,
  ): DefaultSecretManagerClientBuilder {
    this.mauthConfig = new AuthConfig();
    this.mauthConfig.authMethod = ClientKey;
    this.mauthConfig.clientKeyConfigPath = clientKeyConfigPath;
    this.mauthConfig.clientKeyPasswordPath = clientKeyPasswordPath;
    return this;
  }

  /**
   * 使用ACK OIDC JWT配置认证信息
   * @param aapArn 应用访问点ARN
   * @param tokenPath OIDC令牌文件路径
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withACKOidcJwt(
    aapArn: string,
    tokenPath: string,
  ): DefaultSecretManagerClientBuilder {
    this.mauthConfig = new AuthConfig();
    this.mauthConfig.authMethod = ACKOidcJwt;
    this.mauthConfig.aapArn = aapArn;
    this.mauthConfig.tokenPath = tokenPath;
    return this;
  }

  /**
   * 使用ECS实例身份配置认证信息
   * @param aapArn 应用访问点ARN
   * @returns DefaultSecretManagerClientBuilder实例
   */
  withECSInstanceIdentity(
    aapArn: string,
  ): DefaultSecretManagerClientBuilder {
    this.mauthConfig = new AuthConfig();
    this.mauthConfig.authMethod = ECSInstanceIdentity;
    this.mauthConfig.aapArn = aapArn;
    return this;
  }

  /**
   * 构建SecretManagerClient实例
   * @returns SecretManagerClient实例
   */
  build(): SecretManagerClient {
    return new DefaultSecretManagerClient(
      this.regionInfos,
      this.provider,
      this.backoffStrategy,
      this.configMap,
      this.customConfigFile,
      this.mauthConfig,
    );
  }
}

/**
 * 默认SecretManager客户端实现
 */
export class DefaultSecretManagerClient implements SecretManagerClient {
  private clientMap: Map<RegionInfo, Kms20160120> = new Map();
  private regionInfos: RegionInfo[] = [];
  private provider: credentials.CredentialsProvider;
  private backoffStrategy?: BackoffStrategy;
  private configMap: Map<RegionInfo, Config> = new Map();
  private readonly customConfigFile?: string;
  private mauthConfig?: AuthConfig; // mauth认证配置
  // 以regionId为key的bearer认证客户端
  private bearerClients?: Map<string, SecretManagerClientWithBearer>;

  constructor(
    regionInfos: RegionInfo[] = [],
    provider: credentials.CredentialsProvider,
    backoffStrategy?: BackoffStrategy,
    configMap: Map<RegionInfo, Config> = new Map(),
    customConfigFile?: string,
    mauthConfig?: AuthConfig,
  ) {
    this.regionInfos = regionInfos;
    this.provider = provider;
    this.backoffStrategy = backoffStrategy;
    this.configMap = configMap;
    this.customConfigFile = customConfigFile;
    this.mauthConfig = mauthConfig;
  }

  async init(): Promise<void> {
    this.initFromConfigFile();
    this.initFromEnv();
    this.checkRegionInfo();
    UserAgentManager.registerUserAgent(
      CacheClientConstant.USER_AGENT_OF_SECRETS_MANAGER_V2_NODEJS,
      0,
      CacheClientConstant.PROJECT_VERSION,
    );
    if (!this.backoffStrategy) {
      this.backoffStrategy = new FullJitterBackoffStrategy();
    }
    if (this.backoffStrategy) {
      this.backoffStrategy.init();
    }
    if (this.regionInfos.length > 1) {
      this.regionInfos = this.regionInfos.filter(
        (region, index, self) =>
          index ===
          self.findIndex((r) => r.getRegionId() === region.getRegionId()),
      );
    }
    if (this.mauthConfig) {
      // mauth 认证方式：为每个地域构建 bearer 认证客户端，跳过常规 client 初始化
      this.bearerClients = new Map<string, SecretManagerClientWithBearer>();
      for (const regionInfo of this.regionInfos) {
        const mauthObj = MAuth.fromRegion(
          this.mauthConfig,
          regionInfo,
          // 未注册时回退默认日志
          CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)
            ? CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME)
            : undefined,
        );
        this.bearerClients.set(
          regionInfo.getRegionId(),
          new SecretManagerClientWithBearer(mauthObj),
        );
      }
      return;
    }
    if (this.regionInfos.length > 1) {
      this.regionInfos = await this.sortRegionInfos(this.regionInfos);
    }
    for (const regionInfo of this.regionInfos) {
      await this.getClient(regionInfo);
    }
  }

  async getSecretValue(
    request: GetSecretValueRequest,
  ): Promise<GetSecretValueResponse> {
    const futures: Promise<GetSecretValueResponse | undefined>[] = [];
    let countDownLatch:
      | {
          resolved: boolean;
          promise: Promise<void>;
          resolve: () => void;
        }
      | undefined;
    let finishedCount = 0;

    for (let i = 0; i < this.regionInfos.length; i++) {
      if (i === 0) {
        try {
          return await this.getSecretValueByRegion(
            this.regionInfos[0],
            request,
          );
        } catch (e) {
          CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
            "action:getSecretValue",
            e,
          );
          if (!BackoffUtils.judgeNeedRecoveryException(e)) {
            throw e;
          }

          let resolveFn: () => void;
          const promise = new Promise<void>((resolve) => {
            resolveFn = resolve;
          });
          countDownLatch = { resolved: false, promise, resolve: resolveFn! };
          finishedCount = this.regionInfos.length;
        }
      }

      const regionInfo = this.regionInfos[i];
      let newRequest: GetSecretValueRequest = new GetSecretValueRequest({
        secretName: request.secretName,
        versionStage: request.versionStage,
        fetchExtendedConfig: request.fetchExtendedConfig,
      });
      const future = this.retryGetSecretValueTask(
        newRequest,
        regionInfo,
        countDownLatch!,
        {
          count: finishedCount,
          decrement: () => {
            finishedCount--;
            if (
              countDownLatch &&
              finishedCount === 0 &&
              !countDownLatch.resolved
            ) {
              countDownLatch.resolve();
              countDownLatch.resolved = true;
            }
            return finishedCount;
          },
        },
      );
      futures.push(future);
    }

    if (countDownLatch) {
      try {
        await this.promiseWithTimeout(
          countDownLatch.promise,
          CacheClientConstant.REQUEST_WAITING_TIME,
        );

        for (const future of futures) {
          try {
            const result = await future;
            if (result !== undefined) {
              return result;
            }
          } catch (e) {
            CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
              "action:asyncGetSecretValue %s, stack: %s",
              e,
              (e as Error).stack,
            );
          }
        }
      } catch (e) {
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:retryGetSecretValueTask",
          e,
        );
        throw e;
      } finally {
        if (countDownLatch && !countDownLatch.resolved) {
          countDownLatch.resolve();
          countDownLatch.resolved = true;
        }
      }
    }

    throw new AlibabaCloudError({
      code: CacheClientConstant.SDK_READ_TIMEOUT,
      message: `refreshSecretTask fail with secretName[${request.secretName}]`,
    });
  }

  private async promiseWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("Promise timed out")),
        timeoutMs,
      );
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      throw error;
    }
  }

  private async retryGetSecretValueTask(
    req: GetSecretValueRequest,
    regionInfo: RegionInfo,
    countDownLatch: {
      resolved: boolean;
      promise: Promise<void>;
      resolve: () => void;
    },
    finishedCounter: { count: number; decrement: () => number },
  ): Promise<GetSecretValueResponse | undefined> {
    try {
      const result = await this.retryGetSecretValue(
        req,
        regionInfo,
        countDownLatch,
      );
      if (countDownLatch && !countDownLatch.resolved) {
        countDownLatch.resolve();
        countDownLatch.resolved = true;
      }
      return result;
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:retryGetSecretValue call %s, stack: %s",
        e,
        (e as Error).stack,
      );
      return undefined;
    } finally {
      if (finishedCounter.decrement() === 0) {
        if (countDownLatch && !countDownLatch.resolved) {
          countDownLatch.resolve();
          countDownLatch.resolved = true;
        }
      }
    }
  }

  private async retryGetSecretValue(
    req: GetSecretValueRequest,
    regionInfo: RegionInfo,
    countDownLatch: {
      resolved: boolean;
      promise: Promise<void>;
      resolve: () => void;
    },
  ): Promise<GetSecretValueResponse | undefined> {
    let retryTimes = 0;
    let lastException: any = undefined;

    while (true) {
      if (countDownLatch && countDownLatch.resolved) {
        return undefined;
      }

      const waitTimeExponential =
        this.backoffStrategy?.getWaitTimeExponential(retryTimes) ?? -1;

      if (waitTimeExponential < 0) {
        if (lastException) {
          throw lastException;
        }
        throw new AlibabaCloudError({
          message: "Times limit exceeded",
          cause: lastException,
        });
      }

      if (waitTimeExponential > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, waitTimeExponential),
        );
      }

      try {
        return await this.getSecretValueByRegion(regionInfo, req);
      } catch (error) {
        lastException = error;
        CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
          "action:getSecretValue regionInfo:%s retryTimes:%d %s, stack: %s",
          regionInfo.getRegionId(),
          retryTimes,
          error,
          (error as Error).stack,
        );

        if (!BackoffUtils.judgeNeedRecoveryException(error)) {
          throw error;
        }
      }

      retryTimes++;
    }
  }

  private async getSecretValueByRegion(
    regionInfo: RegionInfo,
    req: GetSecretValueRequest,
  ): Promise<GetSecretValueResponse> {
    // mauth 认证方式优先路由到 bearer 认证客户端
    const bc = this.bearerClients?.get(regionInfo.getRegionId());
    if (bc) {
      return await bc.getSecretValue(regionInfo, req);
    }
    const client = await this.getClient(regionInfo);
    return await client.getSecretValue(req);
  }

  private async getClient(regionInfo: RegionInfo): Promise<Kms20160120> {
    let client = this.clientMap.get(regionInfo);
    if (client) {
      return client;
    }

    client = await this.buildKMSClient(regionInfo);
    this.clientMap.set(regionInfo, client);
    return client;
  }

  private async buildKMSClient(regionInfo: RegionInfo): Promise<Kms20160120> {
    let config = this.configMap.get(regionInfo);
    if (!config) {
      config = new Config();
      if (regionInfo.getEndpoint()) {
        config.endpoint = regionInfo.getEndpoint();
        if (
          regionInfo
            .getEndpoint()
            ?.endsWith(CacheClientConstant.INSTANCE_GATEWAY_DOMAIN_SUFFIX)
        ) {
          if (regionInfo.getCaFilePath()) {
            const fs = await import("fs/promises");
            config.ca = await fs.readFile(regionInfo.getCaFilePath()!, "utf-8");
          } else {
            const caContent = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(
              regionInfo.getRegionId(),
            );
            if (!caContent) {
              throw new Error(
                `cannot find the built-in ca certificate for region[${regionInfo.getRegionId()}], please provide the caFilePath parameter.`,
              );
            }
            config.ca = caContent;
          }
        }
      } else if (regionInfo.getVpc()) {
        config.endpoint = KmsEndpointUtils.getVPCEndpoint(
          regionInfo.getRegionId(),
        );
      } else {
        config.endpoint = KmsEndpointUtils.getEndPoint(
          regionInfo.getRegionId(),
        );
      }

      if (this.provider) {
        config.credential = new Credential(null, this.provider);
      } else {
        config.credential = new Credential(
          null,
          DefaultCredentialsProvider.builder().build(),
        );
      }
      config.protocol = CacheClientConstant.DEFAULT_PROTOCOL;
    }

    if (config.ca) {
      const expirationDate = PrivateCaUtils.getCaExpirationUtcDate(config.ca);
      config.userAgent = `${UserAgentManager.getUserAgent()}/${UserAgentManager.getProjectVersion()} ${regionInfo.getRegionId()}_ca_expiration_utc_date/${expirationDate}`;
    } else {
      config.userAgent = `${UserAgentManager.getUserAgent()}/${UserAgentManager.getProjectVersion()}`;
    }
    return new Kms20160120(config);
  }

  close(): void {
    if (this.bearerClients) {
      for (const bc of this.bearerClients.values()) {
        bc.close();
      }
    }
    this.clientMap.clear();
    this.regionInfos = [];
  }

  private checkRegionInfo(): void {
    if (this.regionInfos.length === 0) {
      throw new Error("The param[regionInfo] is needed");
    }
    for (const regionInfo of this.regionInfos) {
      if (!regionInfo.getRegionId()) {
        throw new Error("The param[regionInfo.regionId] is needed");
      }
    }
  }

  private initFromConfigFile(): void {
    const credentialsProperties =
      CredentialsPropertiesUtils.loadCredentialsProperties(
        this.customConfigFile,
      );
    if (credentialsProperties) {
      if (credentialsProperties.provider) {
        this.provider = credentialsProperties.provider;
      }
      if (credentialsProperties.regionInfoList) {
        this.regionInfos.push(...credentialsProperties.regionInfoList);
      }
      this.initMAuthConfig(
        credentialsProperties.sourceProperties ?? {},
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      );
    }
  }

  private initFromEnv(): void {
    const envMap = process.env;
    this.initKmsRegionsFromEnv(envMap);
    this.initCredentialsProviderFromEnv(envMap);
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(envMap)) {
      if (value) {
        properties[key] = value;
      }
    }
    this.initMAuthConfig(properties, CacheClientConstant.SOURCE_TYPE_ENV);
  }

  private initMAuthConfig(
    properties: Record<string, string>,
    sourceType: string,
  ): void {
    if (!this.mauthConfig) {
      this.mauthConfig = CredentialsProviderUtils.initMAuthConfig(
        properties,
        sourceType,
      );
    }
  }

  private initCredentialsProviderFromEnv(envMap: NodeJS.ProcessEnv): void {
    const provider = CredentialsProviderUtils.initCredentialFromEnv(envMap);
    if (provider) {
      this.provider = provider;
    }
  }

  private initKmsRegionsFromEnv(envMap: NodeJS.ProcessEnv): void {
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(envMap)) {
      if (value) {
        properties[key] = value;
      }
    }
    const regionInfos = CredentialsProviderUtils.initKmsRegions(
      properties,
      CacheClientConstant.SOURCE_TYPE_ENV,
    );
    if (regionInfos) {
      this.regionInfos.push(...regionInfos);
    }
  }

  private async sortRegionInfos(
    regionInfos: RegionInfo[],
  ): Promise<RegionInfo[]> {
    const regionInfoExtends: RegionInfoExtend[] = [];

    for (const regionInfo of regionInfos) {
      let pingDelay: number;
      const endpoint =
        regionInfo.getEndpoint() ||
        (regionInfo.getVpc()
          ? KmsEndpointUtils.getVPCEndpoint(regionInfo.getRegionId())
          : KmsEndpointUtils.getEndPoint(regionInfo.getRegionId()));

      try {
        pingDelay = await PingUtils.ping(endpoint);
      } catch (e) {
        pingDelay = -1;
      }

      const regionInfoExtend = new RegionInfoExtend(regionInfo);
      regionInfoExtend.setReachable(pingDelay >= 0);
      regionInfoExtend.setElapsed(
        pingDelay >= 0 ? pingDelay : Number.MAX_VALUE,
      );
      regionInfoExtends.push(regionInfoExtend);
    }

    regionInfoExtends.sort((a, b) => {
      if (a.getReachable() && !b.getReachable()) {
        return -1;
      }
      if (!a.getReachable() && b.getReachable()) {
        return 1;
      }
      return a.getElapsed() - b.getElapsed();
    });

    return regionInfoExtends.map(
      (regionInfoExtend) =>
        new RegionInfo(
          regionInfoExtend.getRegionId(),
          regionInfoExtend.getEndpoint(),
          regionInfoExtend.getVpc(),
          regionInfoExtend.getCaFilePath(),
        ),
    );
  }
}

class RegionInfoExtend {
  private reachable: boolean = false;
  private elapsed: number = Number.MAX_VALUE;
  private readonly regionId: string;
  private readonly vpc?: boolean;
  private readonly endpoint?: string;
  private readonly caFilePath?: string;

  constructor(regionInfo: RegionInfo) {
    this.regionId = regionInfo.getRegionId();
    this.vpc = regionInfo.getVpc();
    this.endpoint = regionInfo.getEndpoint();
    this.caFilePath = regionInfo.getCaFilePath();
  }

  getRegionId(): string {
    return this.regionId;
  }

  getEndpoint(): string | undefined {
    return this.endpoint;
  }

  getVpc(): boolean | undefined {
    return this.vpc;
  }

  getReachable(): boolean {
    return this.reachable;
  }

  setReachable(reachable: boolean): void {
    this.reachable = reachable;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  setElapsed(elapsed: number): void {
    this.elapsed = elapsed;
  }

  getCaFilePath(): string | undefined {
    return this.caFilePath;
  }
}
