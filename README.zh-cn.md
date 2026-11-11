![](https://aliyunsdk-pages.alicdn.com/icons/AlibabaCloud.svg)

# 阿里云凭据管家 Node.js客户端V2

[![GitHub version](https://badge.fury.io/gh/aliyun%2Falibabacloud-secretsmanager-client-nodejs-v2.svg)](https://badge.fury.io/gh/aliyun%2Falibabacloud-secretsmanager-client-nodejs-v2)

阿里云凭据管家 Node.js客户端V2可以使Node.js开发者快速使用阿里云凭据。你可以通过***npm***快速使用。

*其他语言版本: [English](README.md), [简体中文](README.zh-cn.md)*

- [阿里云凭据管家 Node.js客户端V2主页]()
- [Issues](https://github.com/aliyun/alibabacloud-secretsmanager-client-nodejs-v2/issues)
- [Release](https://github.com/aliyun/alibabacloud-secretsmanager-client-nodejs-v2/releases)

## 许可证

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)

## 优势

* 支持用户快速集成获取凭据信息
* 支持阿里云凭据管家内存和文件两种缓存凭据机制
* 支持凭据名称相同场景下的跨地域容灾
* 支持默认规避策略和用户自定义规避策略

## 软件要求

- Node.js 16.0.0 或以上版本
- npm

## 安装

可以通过npm的方式在项目中使用凭据管家 Node.js客户端V2。导入方式如下:

```bash
npm install alibabacloud-secretsmanager-client-v2
```

或者使用yarn:

```bash
yarn add alibabacloud-secretsmanager-client-v2
```

## 构建

你可以从Github检出代码通过下面的命令进行构建。

```bash
npm run build
```

## 示例代码

### 通用示例代码

* 通过系统环境变量或配置文件(secretsmanager.properties)
  构建客户端([系统环境变量设置详情](README_environment.zh-cn.md)、[配置文件设置详情](README_config.zh-cn.md))

```javascript
import { SecretCacheClientBuilder } from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    // 通过环境变量或默认配置构建客户端
    const client = await SecretCacheClientBuilder.newClient();
    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过自定义配置文件(可自定义文件名称或文件路径名称)构建客户端([配置文件设置详情](README_config.zh-cn.md))

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard().withCustomConfigFile('#customConfigFileName#').build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过指定参数(accessKey、accessSecret、regionId等)构建客户端

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withCredentialsProvider(
          CredentialsProviderUtils.withAccessKey(
            process.env['accessKeyId'],
            process.env['accessKeySecret']
          )
        )
        .withRegion('#regionId#')
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

*
通过指定阿里云默认凭据链参数构建客户端。更多信息请参考 [阿里云默认凭据链](https://help.aliyun.com/zh/sdk/developer-reference/v2-manage-access-credentials#3cb4c2e29d9hk)。

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withCredentialsProvider(CredentialsProviderUtils.withDefaultCredential())
        .withRegion('#regionId#')
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过指定参数(roleArn、oidcProviderArn、oidcTokenFilePath等)构建客户端

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withCredentialsProvider(
          CredentialsProviderUtils.withOIDCRoleArnSimple(
            '#roleArn#',
            '#oidcProviderArn#',
            '#oidcTokenFilePath#',
          )
        )
        .withRegion('#regionId#')
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### 定制化用户代码

* 使用自定义参数或用户自己实现

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils,
  FileCacheSecretStoreStrategy,
  DefaultRefreshSecretStrategy,
  FullJitterBackoffStrategy,
  DefaultSecretCacheHook
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withCredentialsProvider(
          CredentialsProviderUtils.withAccessKey(process.env['accessKeyId'], process.env['accessKeySecret'])
        )
        .withRegion('#regionId#')
        .withBackoffStrategy(new FullJitterBackoffStrategy(3, 2000, 10000))
        .build()
    )
      .withCacheSecretStrategy(new FileCacheSecretStoreStrategy('#cacheSecretPath#', true, '#salt#'))
      .withRefreshSecretStrategy(new DefaultRefreshSecretStrategy('#ttlName#'))
      .withCacheStage('#stage#')
      .withSecretCacheHook(new DefaultSecretCacheHook('#stage#'))
      .withSecretTTL('#secretName#', 1 * 60 * 1000)
      .withSecretTTL('#secretName1#', 2 * 60 * 1000)
      .build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过ECS实例身份方式构建客户端

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  RegionInfo
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withECSInstanceIdentity('#aapArn#')
        .addRegionInfo(new RegionInfo('#regionId#', undefined, true))
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过ACK OIDC JWT方式构建客户端

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  RegionInfo
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withACKOidcJwt('#aapArn#', '#oidcTokenFilePath#')
        .addRegionInfo(new RegionInfo('#regionId#', undefined, true))
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* 通过ClientKey方式构建客户端

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withClientKey('#clientKeyPrivateKeyPath#', '#clientKeyPasswordFilePath#')
        .withRegion('#regionId#')
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### CommonJS 使用示例

```javascript
// 使用 CommonJS 语法
const {
  SecretCacheClientBuilder
} = require('alibabacloud-secretsmanager-client-v2');

async function example() {
  try {
    // 通过环境变量或默认配置构建客户端
    const client = await SecretCacheClientBuilder.newClient();
    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## 常见问题 FAQ

### 1. 出现 "cannot find the built-in ca certificate for region[$regionId], please provide the caFilePath parameter." 错误怎么办？

**问题原因：** SDK 中该地域内置的 CA 证书不存在。

**解决方案：**

1. 请更新 SDK 到最新版本。

2. 如果已更新到最新版本仍然报此错误，可以下载最新的CA证书（CA证书可在[密钥管理服务](https://yundun.console.aliyun.com/?spm=5176.12818093.ProductAndResource--ali--widget-product-recent.dre3.3be916d0yK6Zzx&p=kms#/keyStore/list/base/)  - 实例管理 - 实例详情页面下载），并传入CA证书路径参数。具体方式如下：

**方式一：编码方式传递 CA 证书路径**

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils,
  RegionInfo
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    // 创建包含 CA 证书路径的 RegionInfo
    const regionInfo = new RegionInfo();
    regionInfo.setRegionId('#regionId#');
    regionInfo.setEndpoint('#kmsInstanceEndpoint#'); // 指定 KMS 实例地址
    regionInfo.setCaFilePath('#caFilePath#'); // 指定 CA 证书文件路径

    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
      BaseSecretManagerClientBuilder.standard()
        .withCredentialsProvider(
          CredentialsProviderUtils.withAccessKey(
            process.env['accessKeyId'],
            process.env['accessKeySecret']
          )
        )
        .addRegionInfo(regionInfo) // 使用带 CA 证书路径的 RegionInfo
        .build()
    ).build();

    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

**方式二：通过配置文件方式传递 CA 证书路径**
在 `secretsmanager.properties` 配置文件中添加 `caFilePath` 参数：

```
# 关联的KMS服务地域，包含CA证书路径和实例地址
cache_client_region_id=[{"regionId":"<regionId>","endpoint":"<kmsInstanceId>.cryptoservice.kms.aliyuncs.com","caFilePath":"<ca证书文件路径>"}]
```

**方式三：通过环境变量方式传递 CA 证书路径**
参考 [环境变量配置说明](README_environment.zh-cn.md)，在环境变量配置中添加 CA 证书路径参数：

```
# 关联的KMS服务地域，包含CA证书路径和实例地址
cache_client_region_id=[{"regionId":"<regionId>","endpoint":"<kmsInstanceId>.cryptoservice.kms.aliyuncs.com","caFilePath":"<ca证书文件路径>"}]
```
