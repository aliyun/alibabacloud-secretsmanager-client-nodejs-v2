// SDK入口文件

import { SecretCacheClient } from "./SecretCacheClient";
import { SecretCacheClientBuilder } from "./SecretCacheClientBuilder";
import { CacheClientBuilder } from "./CacheClientBuilder";
import { BaseSecretManagerClientBuilder } from "./service/BaseSecretManagerClientBuilder";
import { DefaultSecretManagerClientBuilder } from "./service/DefaultSecretManagerClientBuilder";
import { SecretInfo } from "./model/SecretInfo";
import { CacheSecretException } from "./exception/CacheSecretException";
import { CredentialsProviderUtils } from "./utils/CredentialsProviderUtils";
import { MemoryCacheSecretStoreStrategy } from "./cache/MemoryCacheSecretStoreStrategy";
import { FileCacheSecretStoreStrategy } from "./cache/FileCacheSecretStoreStrategy";
import { DefaultRefreshSecretStrategy } from "./service/DefaultRefreshSecretStrategy";
import { FullJitterBackoffStrategy } from "./service/FullJitterBackoffStrategy";
import { DefaultSecretCacheHook } from "./cache/DefaultSecretCacheHook";
import { CacheSecretInfo } from "./model/CacheSecretInfo";
import { CacheClientConstant } from "./utils/CacheClientConstant";
import { RegionInfo } from "./model/RegionInfo";
import { UserAgentManager } from "./service/UserAgentManager";
import { BackoffUtils } from "./utils/BackoffUtils";
import { MAuth } from "./mauth/MAuth";
import type { AuthToken } from "./mauth/MAuth";
import {
  ACKOidcJwt,
  AuthConfig,
  ClientKey,
  ECSInstanceIdentity,
} from "./mauth/config/Config";
import { SecretManagerClientWithBearer } from "./service/SecretManagerClientBearer";

// 导出所有主要类
export {
  SecretCacheClient,
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  DefaultSecretManagerClientBuilder,
  SecretInfo,
  CacheSecretException,
  CredentialsProviderUtils,
  MemoryCacheSecretStoreStrategy,
  FileCacheSecretStoreStrategy,
  DefaultRefreshSecretStrategy,
  FullJitterBackoffStrategy,
  DefaultSecretCacheHook,
  CacheSecretInfo,
  CacheClientConstant,
  RegionInfo,
  UserAgentManager,
  BackoffUtils,
  MAuth,
  AuthConfig,
  SecretManagerClientWithBearer,
  // mauth 认证方式常量（AuthConfig.authMethod 的封闭取值面）；
  // 独立构造 MAuth 用 MAuth.fromRegion，它按地域补全 endpoint/CA，
  // 与 builder 内部装配同一套推导逻辑
  ECSInstanceIdentity,
  ACKOidcJwt,
  ClientKey,
};

// 导出mauth相关类型
export type { AuthToken };

// 导出接口类型
export type { CacheClientBuilder };