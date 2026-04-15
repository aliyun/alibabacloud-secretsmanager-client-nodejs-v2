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
};

// 导出接口类型
export type { CacheClientBuilder };