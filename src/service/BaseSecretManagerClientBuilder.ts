import { SecretManagerClient } from "./SecretManagerClient";
import { CacheClientBuilder } from "../CacheClientBuilder";
import type { DefaultSecretManagerClientBuilder } from "./DefaultSecretManagerClientBuilder";

/**
 * 基础Secret Manager客户端构建器
 */
export abstract class BaseSecretManagerClientBuilder implements CacheClientBuilder<SecretManagerClient> {
  /**
   * 获取标准构建器
   * @returns 构建器实例
   */
  static standard(): DefaultSecretManagerClientBuilder {
    const {
      DefaultSecretManagerClientBuilder,
    } = require("./DefaultSecretManagerClientBuilder");
    return new DefaultSecretManagerClientBuilder();
  }

  /**
   * 构建Secret Manager客户端
   * @returns Secret Manager客户端
   */
  abstract build(): SecretManagerClient;
}
