![](https://aliyunsdk-pages.alicdn.com/icons/AlibabaCloud.svg)

# Alibaba Cloud Secrets Manager Client V2 for Node.js

[![GitHub version](https://badge.fury.io/gh/aliyun%2Falibabacloud-secretsmanager-client-nodejs-v2.svg)](https://badge.fury.io/gh/aliyun%2Falibabacloud-secretsmanager-client-nodejs-v2)

Alibaba Cloud Secrets Manager Client V2 for Node.js enables Node.js developers to quickly use Alibaba Cloud Secrets. You can get started in minutes using ***npm***.

*Read this in other languages: [English](README.md), [简体中文](README.zh-cn.md)*

- [Alibaba Cloud Secrets Manager Client V2 Homepage]()
- [Issues](https://github.com/aliyun/alibabacloud-secretsmanager-client-nodejs-v2/issues)
- [Release](https://github.com/aliyun/alibabacloud-secretsmanager-client-nodejs-v2/releases)

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)

## Features

* Support quick integration to obtain credential information
* Support two caching mechanisms for Alibaba Cloud Secrets Manager: memory and file
* Support cross-regional disaster recovery with credentials of the same name
* Support default backoff strategy and user-defined backoff strategy

## Requirements

- Node.js 16.0.0 or later
- npm

## Install

You can use the Secrets Manager Node.js Client V2 in your project through npm. Import as follows:

```bash
npm install alibabacloud-secretsmanager-client-v2
```

Or using yarn:

```bash
yarn add alibabacloud-secretsmanager-client-v2
```

## Build

You can check out the code from Github and build it using the following command:

```bash
npm run build
```

## Sample Code

### General Sample Code

* Build client through system environment variables or configuration file (secretsmanager.properties)
  ([System Environment Variables Setup Details](README_environment.md), [Configuration File Setup Details](README_config.md))

```javascript
import { SecretCacheClientBuilder } from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    // Build client via environment variables or default configuration
    const client = await SecretCacheClientBuilder.newClient();
    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

* Build client through custom configuration file (you can customize the file name or file path name) ([Configuration File Setup Details](README_config.md))

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

* Build client with specified parameters (accessKey, accessSecret, regionId, etc.)

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

* Build client with default Alibaba Cloud credential chain parameters. For more information, please refer to [Alibaba Cloud Default Credential Chain](https://help.aliyun.com/zh/sdk/developer-reference/v2-manage-access-credentials#3cb4c2e29d9hk).

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

* Build client with specified parameters (roleArn, oidcProviderArn, oidcTokenFilePath, etc.)

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

### Customized User Code

* Use custom parameters or user's own implementation

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

* Build Secrets Manager Client by ECS instance identity

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

* Build Secrets Manager Client by ACK OIDC JWT

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

* Build Secrets Manager Client by ClientKey

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

### CommonJS Usage Example

```javascript
// Using CommonJS syntax
const {
  SecretCacheClientBuilder
} = require('alibabacloud-secretsmanager-client-v2');

async function example() {
  try {
    // Build client via environment variables or default configuration
    const client = await SecretCacheClientBuilder.newClient();
    const secretInfo = await client.getSecretInfo('#secretName#');
    console.log(secretInfo);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## FAQ

### 1. How to resolve "cannot find the built-in ca certificate for region[$regionId], please provide the caFilePath parameter." error?

**Error Cause:** Built-in CA certificate for the region doesn't exist in the SDK.

**Solution:**

1. Please update the SDK to the latest version.

2. If you still encounter this error after updating to the latest version, you can download the latest CA certificate (CA certificates can be downloaded from the [Key Management Service](https://yundun.console.aliyun.com/?spm=5176.12818093.ProductAndResource--ali--widget-product-recent.dre3.3be916d0yK6Zzx&p=kms#/keyStore/list/base/) - Instance Management - Instance Details page), and pass in the CA certificate path parameter. Specific methods are as follows:

**Method 1: Pass CA certificate path via code**

```javascript
import {
  SecretCacheClientBuilder,
  BaseSecretManagerClientBuilder,
  CredentialsProviderUtils,
  RegionInfo
} from 'alibabacloud-secretsmanager-client-v2';

async function example() {
  try {
    // Create RegionInfo with CA certificate path
    const regionInfo = new RegionInfo();
    regionInfo.setRegionId('#regionId#');
    regionInfo.setEndpoint('#kmsInstanceEndpoint#'); // Specify KMS instance address
    regionInfo.setCaFilePath('#caFilePath#'); // Specify CA certificate file path
    
    const client = await SecretCacheClientBuilder.newCacheClientBuilder(
        BaseSecretManagerClientBuilder.standard()
          .withCredentialsProvider(
            CredentialsProviderUtils.withAccessKey(
              process.env['accessKeyId'],
              process.env['accessKeySecret']
            )
        )
        .addRegionInfo(regionInfo) // Use RegionInfo with CA certificate path
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

**Method 2: Pass CA certificate path via configuration file**
Add `caFilePath` parameter to the `secretsmanager.properties` configuration file:

```
# Associated KMS service region, including CA certificate path and instance address
cache_client_region_id=[{"regionId":"<regionId>","endpoint":"<kmsInstanceId>.cryptoservice.kms.aliyuncs.com","caFilePath":"<ca certificate file path>"}]
```

**Method 3: Pass CA certificate path via environment variable**
Refer to [Environment Variable Configuration Instructions](README_environment.md), add CA certificate path parameter in environment variable configuration:

```
# Associated KMS service region, including CA certificate path and instance address
cache_client_region_id=[{"regionId":"<regionId>","endpoint":"<kmsInstanceId>.cryptoservice.kms.aliyuncs.com","caFilePath":"<ca certificate file path>"}]
```