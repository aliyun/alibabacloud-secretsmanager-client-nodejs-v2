import { CacheClientConstant } from "./CacheClientConstant";
import { CredentialsProviderUtils } from "./CredentialsProviderUtils";
import { ConfigUtils } from "./ConfigUtils";
import { CredentialsProperties } from "../model/CredentialsProperties";

/**
 * 凭证属性工具类
 */
export class CredentialsPropertiesUtils {
  private constructor() {
    // do nothing
  }

  /**
   * 加载凭据配置属性
   * @param fileName 配置文件名
   * @returns 凭据配置属性对象
   */
  static loadCredentialsProperties(
    fileName?: string,
  ): CredentialsProperties | undefined {
    if (!fileName || fileName.trim().length === 0) {
      fileName = CacheClientConstant.CREDENTIALS_PROPERTIES_CONFIG_NAME;
    }
    const properties = ConfigUtils.loadConfig(fileName);
    const credentialsProperties = new CredentialsProperties();
    credentialsProperties.sourceProperties = properties;
    if (properties && Object.keys(properties).length > 0) {
      this.initKmsRegionsFromConfig(credentialsProperties);
      this.initCredentialsProvider(credentialsProperties);
      return credentialsProperties;
    } else {
      return undefined;
    }
  }

  /**
   * 从配置属性初始化KMS地域信息列表
   * @param credentialsProperties 凭据配置属性
   */
  private static initKmsRegionsFromConfig(
    credentialsProperties: CredentialsProperties,
  ): void {
    credentialsProperties.regionInfoList =
      CredentialsProviderUtils.initKmsRegions(
        credentialsProperties.sourceProperties!,
        CacheClientConstant.SOURCE_TYPE_CONFIG,
      );
  }

  /**
   * 初始化凭凭证信息
   * @param credentialsProperties 凭据配置属性
   */
  private static initCredentialsProvider(
    credentialsProperties: CredentialsProperties,
  ): void {
    if (credentialsProperties.sourceProperties) {
      credentialsProperties.provider =
        CredentialsProviderUtils.initCredentialFromConfig(
          credentialsProperties.sourceProperties,
        );
    }
  }
}
