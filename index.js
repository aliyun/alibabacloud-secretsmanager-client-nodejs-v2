// Alibaba Cloud Secrets Manager Client V2 for Nodejs
// Supports Node.js 16, 18, 20+

// 动态导入构建产物，如果构建文件不存在则抛出错误
let exportedMembers;
try {
  exportedMembers = require('./dist/cjs/index.js');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    // 库代码不能杀掉宿主进程：抛错让调用方可捕获、可判断
    throw new Error(
      `构建产物未找到，请先运行 npm run build（原始错误: ${error.message}）`,
    );
  }
  throw error;
}

const {
  SecretCacheClientBuilder,
  SecretCacheClient,
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
  ECSInstanceIdentity,
  ACKOidcJwt,
  ClientKey,
} = exportedMembers;

module.exports = {
  SecretCacheClientBuilder,
  SecretCacheClient,
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
  ECSInstanceIdentity,
  ACKOidcJwt,
  ClientKey,
};