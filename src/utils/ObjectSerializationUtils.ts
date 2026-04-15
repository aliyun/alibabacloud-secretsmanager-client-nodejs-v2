import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";
import fs from "fs-extra";
import path from "path";

/**
 * 对象序列化工具类
 * 提供类似于Java中Gson的功能，能够将JSON反序列化为具有完整方法的类实例
 */
export class ObjectSerializationUtils {
  private constructor() {}

  /**
   * 将对象写入JSON文件
   * @param filePath 文件路径
   * @param fileName 文件名
   * @param obj 要写入的对象
   */
  static async writeObject<T>(
    filePath: string,
    fileName: string,
    obj: T,
  ): Promise<void> {
    await fs.ensureDir(filePath);
    const fullPath = path.join(filePath, fileName);
    await fs.writeJSON(fullPath, obj, { spaces: 2 });
  }

  /**
   * 从JSON文件读取对象并重建为指定类型的实例
   * @param filePath 文件路径
   * @param fileName 文件名
   * @param typeConstructor 类构造函数
   * @returns 重建后的类实例
   */
  static readObject<T>(
    filePath: string,
    fileName: string,
    typeConstructor: new (...args: any[]) => T,
  ): T | undefined {
    const fullPath = path.join(filePath, fileName);

    if (!fs.pathExistsSync(fullPath)) {
      return undefined;
    }

    try {
      const rawData = fs.readJsonSync(fullPath);
      return this.reconstructObject(rawData, typeConstructor);
    } catch (error) {
      console.warn(`Failed to read object from file: ${fullPath}`, error);
      return undefined;
    }
  }

  /**
   * 从JSON数据重建对象实例
   * @param jsonData JSON数据
   * @param typeConstructor 类构造函数
   * @returns 重建后的类实例
   */
  private static reconstructObject<T>(
    jsonData: any,
    typeConstructor: new (...args: any[]) => T,
  ): T {
    if (typeConstructor === CacheSecretInfo) {
      return this.reconstructCacheSecretInfo(jsonData) as unknown as T;
    }
    // 特殊处理 SecretInfo 类
    if (typeConstructor === SecretInfo) {
      return this.reconstructSecretInfo(jsonData) as unknown as T;
    }

    return new typeConstructor(jsonData);
  }

  /**
   * 重建 CacheSecretInfo 实例
   * @param jsonData JSON数据
   * @returns CacheSecretInfo 实例
   */
  private static reconstructCacheSecretInfo(jsonData: any): CacheSecretInfo {
    const secretInfoData = jsonData.secretInfo;
    const stage = jsonData.stage;
    const refreshTimestamp = jsonData.refreshTimestamp;

    const reconstructedSecretInfo = new SecretInfo(
      secretInfoData.secretName,
      secretInfoData.versionId,
      secretInfoData.secretValue,
      secretInfoData.secretDataType,
      secretInfoData.createTime,
      secretInfoData.secretType,
      secretInfoData.automaticRotation,
      secretInfoData.extendedConfig,
      secretInfoData.rotationInterval,
      secretInfoData.nextRotationDate,
    );

    return new CacheSecretInfo(
      reconstructedSecretInfo,
      stage,
      refreshTimestamp,
    );
  }

  /**
   * 重建 SecretInfo 实例
   * @param jsonData JSON数据
   * @returns SecretInfo 实例
   */
  private static reconstructSecretInfo(jsonData: any): SecretInfo {
    return new SecretInfo(
      jsonData.secretName,
      jsonData.versionId,
      jsonData.secretValue,
      jsonData.secretDataType,
      jsonData.createTime,
      jsonData.secretType,
      jsonData.automaticRotation,
      jsonData.extendedConfig,
      jsonData.rotationInterval,
      jsonData.nextRotationDate,
    );
  }

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @param fileName 文件名
   * @returns 文件是否存在
   */
  static exists(filePath: string, fileName: string): boolean {
    const fullPath = path.join(filePath, fileName);
    return fs.pathExistsSync(fullPath);
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   * @param fileName 文件名
   */
  static delete(filePath: string, fileName: string): void {
    const fullPath = path.join(filePath, fileName);
    if (fs.pathExistsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
