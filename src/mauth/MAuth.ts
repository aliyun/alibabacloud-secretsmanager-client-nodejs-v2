import * as fs from "fs";

import { RegionInfo } from "../model/RegionInfo";
import {
  Authenticator,
  AuthenticatorManager,
} from "./authenticator/Authenticator";
import { Config as AuthenticatorConfig } from "./authenticator/Config";
import {
  AuthConfig,
  ClientKey as ClientKeyAuthMethod,
} from "./config/Config";
import { Exchanger, ExchangerManager } from "./exchanger/Exchanger";
import { Config as ExchangerConfig, ExchangerTypeKms } from "./exchanger/Config";
import { DefaultLogger, Wrapper } from "./logger/Logger";
import { extractClientKey } from "./utils/ClientKey";
import { EndpointUtils } from "./utils/EndpointUtils";

/*
 1. 创建一个 mauth 对象，用于认证，通过 Identity 置换 token
 2. mauth 对象由 authenticator、exchanger、config 与 token 缓存（Map）构成
*/

export const AuthTokenTypeClientKey = "ClientKey";

/** 最大剩余时间（小时），低于该值触发刷新 */
export const MaxRemainingTime = 48;

/** 后台刷新间隔（毫秒） */
export const REFRESH_INTERVAL_MILLIS = 10 * 60 * 1000;

const MAX_REMAINING_TIME_MILLIS = MaxRemainingTime * 60 * 60 * 1000;

/**
 * 认证令牌
 */
export interface AuthToken {
  tokenType: string;
  tokenKeyId: string;
  tokenValue: string;
  expiresAt: Date;
}

/**
 * ClientKey 本地配置文件结构
 */
export interface ClientKeyConfig {
  KeyId?: string;
  PrivateKeyData?: string;
}

/**
 * 远程置换返回的 ClientKey 凭据结构
 */
export interface ClientKeyCredential {
  ClientKeyId?: string;
  Password?: string;
  PrivateKeyData?: string;
  KeyAlgorithm?: string;
  KeyOrigin?: string;
  NotAfter?: string;
  NotBefore?: string;
}

/**
 * mauth 认证对象：管理身份认证、凭据置换与令牌缓存
 */
export class MAuth {
  private authenticator?: Authenticator;
  private exchanger?: Exchanger;
  private readonly config: AuthConfig;
  // Node 单线程事件循环，Map 读写天然原子，无需额外加锁
  private cacheToken?: Map<string, AuthToken>;
  private lw: Wrapper;
  private refreshTimer?: NodeJS.Timeout;

  /**
   * 使用 auth config 初始化 MAuth
   * @param c 认证配置
   * @param lw 可选日志包装器
   */
  constructor(c: AuthConfig, lw?: Wrapper) {
    try {
      c.validate();
    } catch (e) {
      throw new Error(`invalid config: ${(e as Error).message}`);
    }

    this.config = c;
    this.lw = lw ?? new DefaultLogger();

    if (c.authMethod === ClientKeyAuthMethod) {
      return;
    }

    // 创建认证器管理器
    let authenticatorManager: Authenticator;
    try {
      const authenticatorConfig = new AuthenticatorConfig();
      authenticatorConfig.authMethod = c.authMethod;
      authenticatorConfig.tokenPath = c.tokenPath;
      authenticatorManager = new AuthenticatorManager(authenticatorConfig);
    } catch (e) {
      throw new Error(
        `failed to create authenticator manager: ${(e as Error).message}`,
      );
    }
    this.authenticator = authenticatorManager;

    // 创建交换器
    const exchangerConfig = new ExchangerConfig();
    exchangerConfig.exchangerType = ExchangerTypeKms;
    exchangerConfig.kmsEndpoint = c.kmsEndpoint;
    exchangerConfig.aapArn = c.aapArn;
    exchangerConfig.ca = c.ca;

    let exchangerObj: Exchanger;
    try {
      exchangerObj = new ExchangerManager(exchangerConfig);
    } catch (e) {
      throw new Error(`failed to create exchanger: ${(e as Error).message}`);
    }
    this.exchanger = exchangerObj;

    // 新增定时任务主动更新缓存，要防止异常导致进程退出
    this.refreshTimer = setInterval(() => {
      this.refreshToken()
        .catch((r) => {
          this.lw.error("Unexpected error in refreshToken timer: %s", r);
          // 常规刷新失败仅在 refreshToken 内部记日志、不会抛到这里；
          // 到这里说明是非预期异常，记录后停止定时任务，进程本身不退出
          if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
          }
        });
    }, REFRESH_INTERVAL_MILLIS);
    // 不阻塞进程退出
    this.refreshTimer.unref?.();
  }

  /**
   * 按地域补全 endpoint 与 CA 后构造 MAuth。
   *
   * 仅当 config.kmsEndpoint 为空时才按 regionInfo 推导（显式指定的 endpoint 优先，
   * 与 builder 的装配口径一致）；ca 同理，config.ca 已有值时不覆盖。
   * 传入的 config 不会被改写：内部先浅拷贝一份再补值。
   *
   * @param config 认证配置
   * @param regionInfo 地域信息
   * @param lw 可选日志包装器
   */
  static fromRegion(
    config: AuthConfig,
    regionInfo: RegionInfo,
    lw?: Wrapper,
  ): MAuth {
    const cfg: AuthConfig = Object.assign(new AuthConfig(), config);
    if (!cfg.kmsEndpoint) {
      let resolved: { endpoint: string; ca?: string };
      try {
        resolved = EndpointUtils.resolveEndpointAndCa(regionInfo);
      } catch (e) {
        throw new Error(
          `failed to resolve endpoint and ca for region[${regionInfo.getRegionId()}]: ${
            (e as Error).message
          }`,
        );
      }
      cfg.kmsEndpoint = resolved.endpoint;
      if (!cfg.ca) {
        cfg.ca = resolved.ca;
      }
    }
    try {
      return new MAuth(cfg, lw);
    } catch (e) {
      throw new Error(
        `failed to init mauth for region[${regionInfo.getRegionId()}]: ${
          (e as Error).message
        }`,
      );
    }
  }

  /*
  getToken 获取 token
  整体逻辑:
  服务端签发 72 小时有效期的临时client key, 客户端在使用一天后会重新获取，获取失败也能有 48 小时的容错窗口。 服务端对客户端使用 48 小时内凭据访问进行监控和报警。
  流程：
  1. 如果缓存的 token 过期时间大于 48 小时，则返回缓存的 token
  2. 如果缓存的 token 过期时间小于 48 小时，则重新获取 token
  3. 如果缓存的 token 不存在，则重新获取 token
  4. 如果获取 token 失败，缓存 token 未过期，则返回缓存的 token
  5. 如果 auth method 是 ClientKey, 则调用 getClientKeyByLocalFile获取
  6. 如果 auth method 是 ECSInstanceIdentity、ACKOidcJwt 则调用 getTokenFromRemote获取
  7. 获取失败，假如缓存中存在 未过期的token，则返回缓存的 token
  8. 获取成功，则返回 token，缓存 token

  @param aapArnOverride 可选的 AapArn 覆盖值（非空时优先于实例配置）
  */
  async getToken(aapArnOverride?: string): Promise<AuthToken> {
    const aapArn = this.resolveAapArn(aapArnOverride);

    // 1. 如果缓存的 token 过期时间大于 48 小时，则返回缓存的 token
    const cachedToken = this.cacheToken?.get(aapArn);
    if (cachedToken) {
      const remainingTime = cachedToken.expiresAt.getTime() - Date.now();
      if (remainingTime > MAX_REMAINING_TIME_MILLIS) {
        return cachedToken;
      }
    }

    let newToken: AuthToken;

    try {
      // 4. 如果 auth method 是 ClientKey, 则调用 getClientKeyByLocalFile获取
      if (this.config.authMethod === ClientKeyAuthMethod) {
        newToken = await this.getClientKeyByLocalFile();
      } else {
        // 5. 如果 auth method 是 ECSInstanceIdentity、ACKOidcJwt 则调用 getTokenFromRemote获取
        newToken = await this.getTokenFromRemote(aapArnOverride);
      }
    } catch (e) {
      // 6. 获取失败，假如缓存中存在 未过期的token，则返回缓存的 token
      const fallbackToken = this.cacheToken?.get(aapArn);
      if (fallbackToken && Date.now() < fallbackToken.expiresAt.getTime()) {
        this.lw.warn(
          "Using cached token for AAP ARN %s, expires at %s",
          aapArn,
          fallbackToken.expiresAt,
        );
        return fallbackToken;
      }
      throw new Error(
        `failed to get new token and no valid cached token available: ${
          (e as Error).message
        }`,
      );
    }

    // 7. 获取成功，则返回 token，缓存 token
    if (!this.cacheToken) {
      this.cacheToken = new Map<string, AuthToken>();
    }
    this.cacheToken.set(aapArn, newToken);

    return newToken;
  }

  /*
  refreshToken: 定时刷新缓存的 token
  1. 遍历缓存的 token
  3. 如果 token 过期时间小于 48 小时，则重新获取 token, 如果 token 过期时间大于 48 小时，则不需要更新
  4. 打印出刷新中的异常，以及缓存的 token 必要信息，不能打印token 内容。
  */
  async refreshToken(): Promise<void> {
    if (!this.cacheToken) {
      this.lw.info("cacheToken is undefined");
      return;
    }
    if (this.cacheToken.size === 0) {
      this.lw.info("cacheToken is empty");
      return;
    }
    const currentTime = Date.now();
    const toRefresh: string[] = [];

    for (const [aapArn, token] of this.cacheToken) {
      if (token.expiresAt.getTime() - currentTime <= MAX_REMAINING_TIME_MILLIS) {
        toRefresh.push(aapArn);
      }
    }

    // 3. 执行网络请求（getToken），失败仅记录日志不中断
    for (const aapArn of toRefresh) {
      this.lw.info("Token for AAP ARN %s needs refresh", aapArn);

      let newToken: AuthToken;
      try {
        newToken = await this.getToken(aapArn);
      } catch (e) {
        this.lw.error("Failed to refresh token for %s: %s", aapArn, e);
        continue;
      }
      // 检查 token 有效期，看是不是拿了缓存的
      if (
        newToken.expiresAt.getTime() - currentTime <=
        MAX_REMAINING_TIME_MILLIS
      ) {
        this.lw.warn(
          "Using cached token for AAP ARN %s, expires at %s",
          aapArn,
          newToken.expiresAt,
        );
      } else {
        this.lw.info(
          "Successfully refreshed token for AAP ARN %s, expires at %s",
          aapArn,
          newToken.expiresAt,
        );
      }
    }
  }

  /**
   * 关闭MAuth，停止后台定时刷新任务
   */
  close(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * 清除Token 缓存
   * @param aapArnOverride 可选的 AapArn 覆盖值（非空时优先于实例配置）
   */
  clearToken(aapArnOverride?: string): void {
    const aapArn = this.resolveAapArn(aapArnOverride);

    if (this.cacheToken) {
      this.cacheToken.delete(aapArn);
    }
  }

  /**
   * 解析生效的 AapArn：ClientKey 认证方式固定为 "ClientKey"；
   * 否则覆盖值优先，其次实例配置，均无则为空字符串
   */
  private resolveAapArn(aapArnOverride?: string): string {
    if (this.config.authMethod === ClientKeyAuthMethod) {
      return "ClientKey";
    }
    return aapArnOverride || this.config.aapArn || "";
  }

  /*
  getClientKeyByLocalFile
  1. 从本地文件获取客户端密钥和密码
  2. 调用 extractClientKey 解密客户端密钥和密码, 获取私钥
  3. 构成 AuthToken，返回
  */
  private async getClientKeyByLocalFile(): Promise<AuthToken> {
    // 1. 从本地文件获取客户端密钥和密码
    if (!this.config.clientKeyConfigPath) {
      throw new Error("client key config path is not set");
    }

    // 读取配置文件（node fs 直接按 utf-8 读成字符串，省去 Buffer 中间层）
    let configText: string;
    try {
      configText = await fs.promises.readFile(
        this.config.clientKeyConfigPath,
        "utf-8",
      );
    } catch (e) {
      throw new Error(
        `failed to read client key config file: ${(e as Error).message}`,
      );
    }
    let cc: ClientKeyConfig;
    try {
      cc = JSON.parse(configText);
    } catch (e) {
      throw new Error(
        `failed to parse client key config: ${(e as Error).message}`,
      );
    }

    // 获取密码：优先使用已配置的密码，否则从密码文件读取
    let password = this.config.clientKeyPassword;
    if (!password) {
      if (!this.config.clientKeyPasswordPath) {
        throw new Error("client key password or password path is not set");
      }
      let passwordData: Buffer;
      try {
        passwordData = await fs.promises.readFile(
          this.config.clientKeyPasswordPath,
        );
      } catch (e) {
        throw new Error(
          `failed to read client key password file: ${(e as Error).message}`,
        );
      }
      password = passwordData.toString("utf-8").trim();
    }

    // 2. 调用 extractClientKey 解密客户端密钥和密码, 获取私钥
    let privateKeyPem: string;
    let expiresAt: Date;
    try {
      const result = extractClientKey(password!, cc.PrivateKeyData ?? "");
      privateKeyPem = result.privateKeyPem;
      expiresAt = result.expiresAt;
    } catch (e) {
      throw new Error(
        `failed to decrypt client key: ${(e as Error).message}`,
      );
    }

    // 3. 构成 AuthToken，返回
    return {
      tokenType: AuthTokenTypeClientKey,
      tokenKeyId: cc.KeyId ?? "",
      tokenValue: privateKeyPem,
      expiresAt: expiresAt,
    };
  }

  private async getTokenFromRemote(
    aapArnOverride?: string,
  ): Promise<AuthToken> {
    // 通过authenticator获取身份凭证
    let identityValue: string;
    try {
      const identity = await this.authenticator!.getIdentity();
      identityValue = identity.identityValue;
    } catch (e) {
      throw new Error(`failed to get identity: ${(e as Error).message}`);
    }

    // 通过exchanger交换令牌
    let tokenType: string;
    let tokenValue: string;
    try {
      const result = await this.exchanger!.exchangeCredential(
        identityValue,
        aapArnOverride,
      );
      tokenType = result.tokenType;
      tokenValue = result.tokenValue;
    } catch (e) {
      throw new Error(
        `failed to exchange credential: ${(e as Error).message}`,
      );
    }

    if (tokenType !== AuthTokenTypeClientKey) {
      throw new Error(`invalid token type: ${tokenType}`);
    }

    let cc: ClientKeyCredential;
    try {
      cc = JSON.parse(tokenValue);
    } catch (e) {
      throw new Error(
        `failed to parse client key credential: ${(e as Error).message}`,
      );
    }

    let privateKeyPem: string;
    let expiresAt: Date;
    try {
      const result = extractClientKey(
        cc.Password ?? "",
        cc.PrivateKeyData ?? "",
      );
      privateKeyPem = result.privateKeyPem;
      expiresAt = result.expiresAt;
    } catch (e) {
      throw new Error(
        `failed to decrypt client key: ${(e as Error).message}`,
      );
    }

    // 构建并返回AuthToken
    return {
      tokenType: tokenType,
      tokenKeyId: cc.ClientKeyId ?? "",
      tokenValue: privateKeyPem,
      expiresAt: expiresAt,
    };
  }
}
