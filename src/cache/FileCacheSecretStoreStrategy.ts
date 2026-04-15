import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { CacheSecretStoreStrategy } from "./CacheSecretStoreStrategy";
import { ObjectSerializationUtils } from "../utils/ObjectSerializationUtils";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { AESConst } from "../utils/AESConst";
import { CacheClientConstant } from "../utils/CacheClientConstant";
import { AESUtils } from "../utils/AESUtils";
import { CommonLogger } from "../utils/CommonLogger";

/**
 * 文件缓存凭据存储策略
 */
export class FileCacheSecretStoreStrategy implements CacheSecretStoreStrategy {
  private static readonly JSON_FILE_NAME_PREFIX = "stage_";
  private static readonly JSON_FILE_NAME_SUFFIX = ".json";
  private static readonly BASE64_ENCODING = "base64";

  /**
   * 缓存凭据文件路径
   */
  private cacheSecretPath: string;

  /**
   * 首次启动时候是否允许从文件进行加载，true为允许
   */
  private readonly reloadOnStart: boolean;

  /**
   * 加解密过程中使用的salt
   */
  private readonly salt: string;

  private readonly reloadedSet = new Set<string>();
  private readonly cacheSecretInfoMap = new Map<string, CacheSecretInfo>();

  constructor(
    cacheSecretPath: string,
    reloadOnStart: boolean = true,
    salt?: string,
  ) {
    this.cacheSecretPath = cacheSecretPath;
    this.reloadOnStart = reloadOnStart;
    this.salt = salt || "";
  }

  async init(): Promise<void> {
    if (!this.cacheSecretPath) {
      this.cacheSecretPath = ".";
    }
    if (!this.salt) {
      throw new Error("the argument[salt] must not be null");
    }
  }

  async storeSecret(cacheSecretInfo: CacheSecretInfo): Promise<void> {
    const memoryCacheSecretInfo = cacheSecretInfo.clone();
    const fileCacheSecretInfo = cacheSecretInfo.clone();
    const secretInfo = fileCacheSecretInfo.getSecretInfo();
    const secretValue = secretInfo.getSecretValue();
    const encryptedValue = this.encryptSecretValue(
      secretValue,
      this.generateRandomKey(),
    );
    secretInfo.setSecretValue(encryptedValue);
    const fileName = (
      FileCacheSecretStoreStrategy.JSON_FILE_NAME_PREFIX +
      cacheSecretInfo.getStage() +
      FileCacheSecretStoreStrategy.JSON_FILE_NAME_SUFFIX
    ).toLowerCase();
    const cacheSecretPath = path.join(
      this.cacheSecretPath,
      secretInfo.getSecretName(),
    );
    const filePath = path.join(cacheSecretPath, fileName);

    await fs.ensureDir(cacheSecretPath);

    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
    }

    await fs.writeJSON(filePath, fileCacheSecretInfo, { spaces: 2 });
    this.cacheSecretInfoMap.set(
      secretInfo.getSecretName(),
      memoryCacheSecretInfo,
    );
    this.reloadedSet.add(cacheSecretInfo.getSecretInfo().getSecretName());
  }

  getCacheSecretInfo(secretName: string): CacheSecretInfo | undefined {
    if (!this.reloadOnStart && !this.reloadedSet.has(secretName)) {
      return undefined;
    }
    const memoryCacheSecretInfo = this.cacheSecretInfoMap.get(secretName);
    if (memoryCacheSecretInfo) {
      return memoryCacheSecretInfo;
    }

    // Try to read from file with ACSCurrent stage first
    const fileName = (
      FileCacheSecretStoreStrategy.JSON_FILE_NAME_PREFIX +
      CacheClientConstant.STAGE_ACS_CURRENT +
      FileCacheSecretStoreStrategy.JSON_FILE_NAME_SUFFIX
    ).toLowerCase();
    const cacheSecretPath = path.join(this.cacheSecretPath, secretName);
    const filePath = path.join(cacheSecretPath, fileName);

    if (!fs.pathExistsSync(filePath)) {
      return undefined;
    }

    try {
      const cacheSecretInfo = ObjectSerializationUtils.readObject(
        path.dirname(filePath),
        path.basename(filePath),
        CacheSecretInfo,
      );

      if (!cacheSecretInfo) {
        return undefined;
      }

      const secretInfo = cacheSecretInfo.getSecretInfo();
      const decryptedValue = this.decryptSecretValue(
        secretInfo.getSecretValue(),
      );
      secretInfo.setSecretValue(decryptedValue);
      this.cacheSecretInfoMap.set(secretInfo.getSecretName(), cacheSecretInfo);
      this.reloadedSet.add(secretInfo.getSecretName());
      return cacheSecretInfo;
    } catch (error) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).warnf(
        "Failed to read cache file: %s",
        error,
      );
      return undefined;
    }
  }

  private encryptSecretValue(secretValue: string, key: Buffer): string {
    const mode = AESConst.AES_256_CBC_MODE_KEY;
    const iv = crypto.randomBytes(AESConst.IV_LENGTH);

    const encryptedData = AESUtils.encrypt(
      mode,
      new TextEncoder().encode(secretValue),
      key,
      iv,
      this.salt,
    );

    const modeKeyBytes = Buffer.from(AESConst.AES_256_CBC_MODE_KEY);
    const combinedBuffer = Buffer.concat([
      modeKeyBytes,
      key,
      iv,
      Buffer.from(encryptedData),
    ]);

    return combinedBuffer.toString(
      FileCacheSecretStoreStrategy.BASE64_ENCODING,
    );
  }

  private decryptSecretValue(secretValue: string): string {
    const decodeBytes = Buffer.from(
      secretValue,
      FileCacheSecretStoreStrategy.BASE64_ENCODING,
    );
    const modeKeyLength = AESConst.AES_256_CBC_MODE_KEY.length;
    const modeKeyBytes = decodeBytes.subarray(0, modeKeyLength);
    const keyBytes = decodeBytes.subarray(
      modeKeyLength,
      modeKeyLength + AESConst.RANDOM_KEY_LENGTH,
    );
    const ivBytes = decodeBytes.subarray(
      modeKeyLength + AESConst.RANDOM_KEY_LENGTH,
      modeKeyLength + AESConst.RANDOM_KEY_LENGTH + AESConst.IV_LENGTH,
    );
    const secretBytes = decodeBytes.subarray(
      modeKeyLength + AESConst.RANDOM_KEY_LENGTH + AESConst.IV_LENGTH,
    );

    return AESUtils.decrypt(
      new TextDecoder().decode(modeKeyBytes),
      new Uint8Array(secretBytes),
      new Uint8Array(keyBytes),
      new Uint8Array(ivBytes),
      this.salt,
    );
  }

  private generateRandomKey(): Buffer {
    return crypto.randomBytes(AESConst.RANDOM_KEY_LENGTH);
  }

  close(): void {}
}
