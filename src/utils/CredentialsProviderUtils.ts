import { CacheClientConstant } from "./CacheClientConstant";
import { RegionInfo } from "../model/RegionInfo";
import {
  ECSRAMRoleCredentialsProvider,
  CredentialsProvider,
  StaticAKCredentialsProvider,
  OIDCRoleArnCredentialsProvider,
} from "@alicloud/credentials";

/**
 * 凭证提供者工具类
 */
export class CredentialsProviderUtils {
  /**
   * 使用AccessKey创建凭证提供者
   * @param accessKeyId AccessKey ID
   * @param accessKeySecret AccessKey Secret
   * @returns 凭证提供者
   */
  static withAccessKey(
    accessKeyId: string,
    accessKeySecret: string,
  ): CredentialsProvider {
    return StaticAKCredentialsProvider.builder()
      .withAccessKeyId(accessKeyId)
      .withAccessKeySecret(accessKeySecret)
      .build();
  }

  /**
   * 使用ECS RAM角色创建凭证提供者
   * @param roleName 角色名称
   * @returns 凭证提供者
   */
  static withEcsRamRole(roleName: string): CredentialsProvider {
    return ECSRAMRoleCredentialsProvider.builder()
      .withRoleName(roleName)
      .build();
  }

  /**
   * 使用OIDC角色ARN创建凭证提供者（简化版）
   * @param roleArn 角色ARN
   * @param oidcProviderArn OIDC提供者ARN
   * @param oidcTokenFilePath OIDC令牌文件路径
   * @returns 凭证提供者
   */
  static withOIDCRoleArnSimple(
    roleArn: string,
    oidcProviderArn: string,
    oidcTokenFilePath: string,
  ): CredentialsProvider {
    return OIDCRoleArnCredentialsProvider.builder()
      .withRoleArn(roleArn)
      .withOIDCProviderArn(oidcProviderArn)
      .withOIDCTokenFilePath(oidcTokenFilePath)
      .build();
  }

  /**
   * 使用OIDC角色ARN创建凭证提供者
   * @param roleSessionName 角色会话名称
   * @param roleArn 角色ARN
   * @param oidcProviderArn OIDC提供者ARN
   * @param oidcTokenFilePath OIDC令牌文件路径
   * @param policy 策略
   * @param stsEndpoint STS域名
   * @param roleSessionExpiration 角色会话过期时间
   * @param stsRegionId STS地域ID
   * @returns 凭证提供者
   */
  static withOIDCRoleArn(
    roleSessionName: string,
    roleArn: string,
    oidcProviderArn: string,
    oidcTokenFilePath: string,
    policy: string,
    stsEndpoint: string,
    roleSessionExpiration: number,
    stsRegionId: string,
  ): CredentialsProvider {
    return OIDCRoleArnCredentialsProvider.builder()
      .withRoleSessionName(roleSessionName)
      .withRoleArn(roleArn)
      .withOIDCProviderArn(oidcProviderArn)
      .withOIDCTokenFilePath(oidcTokenFilePath)
      .withPolicy(policy)
      .withStsEndpoint(stsEndpoint)
      .withDurationSeconds(roleSessionExpiration)
      .withStsRegionId(stsRegionId)
      .build();
  }

  /**
   * 通用凭证信息初始化方法
   * @param map Map对象（可以是环境变量或配置文件属性）
   * @param sourceTypeName 数据源类型（"config" 或 "env"）
   * @returns 凭证提供者
   */
  static initCredential(
    map: Record<string, string>,
    sourceTypeName: string,
  ): CredentialsProvider | undefined {
    const credentialsType =
      map[CacheClientConstant.VARIABLE_CREDENTIALS_TYPE_KEY];
    if (!credentialsType) {
      return undefined;
    }

    let provider: CredentialsProvider;
    switch (credentialsType) {
      case "ak":
        const accessKeyId =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY];
        const accessSecret =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY];
        if (!accessKeyId) {
          throw new Error(
            `${sourceTypeName} credentials missing required parameters[${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_KEY_ID_KEY}].`,
          );
        }
        if (!accessSecret) {
          throw new Error(
            `${sourceTypeName} credentials missing required parameters[${CacheClientConstant.VARIABLE_CREDENTIALS_ACCESS_SECRET_KEY}].`,
          );
        }
        provider = CredentialsProviderUtils.withAccessKey(
          accessKeyId,
          accessSecret,
        );
        break;
      case "ecs_ram_role":
        const roleName =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_ROLE_NAME_KEY];
        if (!roleName) {
          throw new Error(
            `${sourceTypeName} credentials missing required parameters[${CacheClientConstant.VARIABLE_CREDENTIALS_ROLE_NAME_KEY}].`,
          );
        }
        provider = CredentialsProviderUtils.withEcsRamRole(roleName);
        break;
      case "oidc_role_arn":
        const roleSessionExpiration = parseInt(
          map[
            CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_DURATION_SECONDS_KEY
          ] || "0",
        );
        const roleSessionName =
          map[
            CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_SESSION_NAME_KEY
          ];
        const roleArn =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_ROLE_ARN_KEY];
        const oidcProviderArn =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_PROVIDER_ARN_KEY];
        const oidcTokenFilePath =
          map[
            CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_TOKEN_FILE_PATH_KEY
          ];
        const stsRegionId =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_STS_REGION_ID_KEY];
        const policy =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_POLICY_KEY];
        const stsEndpoint =
          map[CacheClientConstant.VARIABLE_CREDENTIALS_OIDC_STS_ENDPOINT_KEY];
        provider = CredentialsProviderUtils.withOIDCRoleArn(
          roleSessionName,
          roleArn,
          oidcProviderArn,
          oidcTokenFilePath,
          policy,
          stsEndpoint,
          roleSessionExpiration,
          stsRegionId,
        );
        break;
      default:
        throw new Error(
          `${sourceTypeName} credentials type[${credentialsType}] is illegal`,
        );
    }
    return provider;
  }

  /**
   * 从环境变量初始化凭证提供者
   * @param envMap 环境变量映射
   * @returns 凭证提供者
   */
  static initCredentialFromEnv(
    envMap: NodeJS.ProcessEnv,
  ): CredentialsProvider | undefined {
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(envMap)) {
      if (value) {
        map[key] = value;
      }
    }
    return CredentialsProviderUtils.initCredential(
      map,
      CacheClientConstant.SOURCE_TYPE_ENV,
    );
  }

  /**
   * 从配置初始化凭证提供者
   * @param properties 配置属性
   * @returns 凭证提供者
   */
  static initCredentialFromConfig(
    properties: Record<string, string>,
  ): CredentialsProvider | undefined {
    return CredentialsProviderUtils.initCredential(
      properties,
      CacheClientConstant.SOURCE_TYPE_CONFIG,
    );
  }

  /**
   * 从配置属性或环境变量初始化KMS地域信息列表
   * @param properties 配置属性
   * @param sourceType 配置属性来源("config" 或 "env")
   * @returns 地域信息列表
   */
  static initKmsRegions(
    properties: Record<string, string>,
    sourceType: string,
  ): RegionInfo[] {
    const regionInfoList: RegionInfo[] = [];
    const regionIds =
      properties[CacheClientConstant.VARIABLE_CACHE_CLIENT_REGION_ID_KEY];
    if (regionIds) {
      try {
        const list: Array<Record<string, any>> = JSON.parse(regionIds);
        for (const map of list) {
          const regionInfo = new RegionInfo(
            map[CacheClientConstant.VARIABLE_REGION_REGION_ID_NAME_KEY],
            map[CacheClientConstant.VARIABLE_REGION_ENDPOINT_NAME_KEY],
          );
          regionInfo.setVpc(
            map[CacheClientConstant.VARIABLE_REGION_VPC_NAME_KEY],
          );
          regionInfo.setCaFilePath(
            map[CacheClientConstant.VARIABLE_REGION_CA_FILE_PATH_NAME_KEY],
          );
          regionInfoList.push(regionInfo);
        }
      } catch (e) {
        throw new Error(
          `${sourceType} credentials param[${CacheClientConstant.VARIABLE_CACHE_CLIENT_REGION_ID_KEY}] is illegal`,
        );
      }
    }
    return regionInfoList;
  }
}
