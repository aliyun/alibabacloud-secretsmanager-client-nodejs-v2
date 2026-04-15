import { CacheClientConstant } from "../utils/CacheClientConstant";
import { ByteBufferUtils } from "../utils/ByteBufferUtils";

/**
 * 凭据信息模型
 */
export class SecretInfo {
  /**
   * 凭据名称
   */
  private secretName: string;

  /**
   * 凭据版本ID
   */
  private versionId: string;

  /**
   * 凭据值
   */
  private secretValue: string;

  /**
   * 凭据字节缓冲值
   */
  private secretValueByteBuffer?: Buffer;

  /**
   * 凭据数据类型
   */
  private secretDataType?: string;

  /**
   * 凭据创建时间
   */
  private createTime?: string;

  /**
   * 凭据类型
   */
  private secretType?: string;

  /**
   * 凭据自动轮转配置
   */
  private automaticRotation?: string;

  /**
   * 凭据扩展配置
   */
  private extendedConfig?: string;

  /**
   * 凭据轮转间隔时间
   */
  private rotationInterval?: string;

  /**
   * 凭据下次轮转日期
   */
  private nextRotationDate?: string;

  constructor(
    secretName: string,
    versionId: string,
    secretValue: string,
    secretDataType?: string,
    createTime?: string,
    secretType?: string,
    automaticRotation?: string,
    extendedConfig?: string,
    rotationInterval?: string,
    nextRotationDate?: string,
  ) {
    this.secretName = secretName;
    this.versionId = versionId;
    this.secretValue = secretValue;
    this.secretDataType = secretDataType;
    this.createTime = createTime;
    this.secretType = secretType;
    this.automaticRotation = automaticRotation;
    this.extendedConfig = extendedConfig;
    this.rotationInterval = rotationInterval;
    this.nextRotationDate = nextRotationDate;
  }

  // Getter methods
  getSecretName(): string {
    return this.secretName;
  }

  getVersionId(): string | undefined {
    return this.versionId;
  }

  getSecretValue(): string {
    return this.secretValue;
  }

  getSecretDataType(): string | undefined {
    return this.secretDataType;
  }

  getCreateTime(): string | undefined {
    return this.createTime;
  }

  getSecretType(): string | undefined {
    return this.secretType;
  }

  getAutomaticRotation(): string | undefined {
    return this.automaticRotation;
  }

  getExtendedConfig(): string | undefined {
    return this.extendedConfig;
  }

  getRotationInterval(): string | undefined {
    return this.rotationInterval;
  }

  getNextRotationDate(): string | undefined {
    return this.nextRotationDate;
  }

  // Setter methods
  setSecretName(secretName: string): SecretInfo {
    this.secretName = secretName;
    return this;
  }

  setVersionId(versionId: string): SecretInfo {
    this.versionId = versionId;
    return this;
  }

  setSecretValue(secretValue: string): SecretInfo {
    this.secretValue = secretValue;
    return this;
  }

  setSecretDataType(secretDataType: string): SecretInfo {
    this.secretDataType = secretDataType;
    return this;
  }

  setCreateTime(createTime: string): SecretInfo {
    this.createTime = createTime;
    return this;
  }

  setSecretType(secretType?: string): SecretInfo {
    this.secretType = secretType;
    return this;
  }

  setAutomaticRotation(automaticRotation?: string): SecretInfo {
    this.automaticRotation = automaticRotation;
    return this;
  }

  setExtendedConfig(extendedConfig?: string): SecretInfo {
    this.extendedConfig = extendedConfig;
    return this;
  }

  setRotationInterval(rotationInterval?: string): SecretInfo {
    this.rotationInterval = rotationInterval;
    return this;
  }

  setNextRotationDate(nextRotationDate?: string): SecretInfo {
    this.nextRotationDate = nextRotationDate;
    return this;
  }

  getSecretValueByteBuffer(): Buffer {
    if (this.secretDataType === CacheClientConstant.BINARY_DATA_TYPE) {
      return ByteBufferUtils.convertStringToByte(this.secretValue);
    }
    return this.secretValueByteBuffer || Buffer.alloc(0);
  }

  setSecretValueByteBuffer(buffer: Buffer): SecretInfo {
    this.secretValueByteBuffer = buffer;
    return this;
  }

  /**
   * 克隆SecretInfo对象
   * @returns 克隆的对象
   */
  clone(): SecretInfo {
    return new SecretInfo(
      this.secretName,
      this.versionId,
      this.secretValue,
      this.secretDataType,
      this.createTime,
      this.secretType,
      this.automaticRotation,
      this.extendedConfig,
      this.rotationInterval,
      this.nextRotationDate,
    );
  }

}
