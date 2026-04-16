import { CacheClientConstant } from "./CacheClientConstant";
import * as crypto from "crypto";
import { CacheSecretException } from "../exception/CacheSecretException";
import { AESConst } from "./AESConst";
import { CommonLogger } from "./CommonLogger";

/**
 * AES加密工具类
 */
export class AESUtils {
  /**
   * 使用AES加密数据
   * @param mode 加密模式
   * @param data 待加密的数据
   * @param secret 密钥
   * @param iv 初始化向量
   * @param salt 盐值
   * @returns 加密后的数据
   */
  static encrypt(
    mode: string,
    data: Uint8Array,
    secret: Uint8Array,
    iv: Uint8Array,
    salt: string,
  ): Uint8Array {
    try {
      const algorithm =
        AESConst.CIPHER_MODE_MAP[mode] || AESConst.DEFAULT_CIPHER_MODE;

      const key = crypto.pbkdf2Sync(
        Buffer.from(new TextDecoder().decode(secret)),
        Buffer.from(salt),
        AESConst.DEFAULT_ITERATIONS,
        AESConst.KEY_LENGTH / 8,
        AESConst.PBKDF2_HASH_ALGORITHM,
      );

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAutoPadding(true);

      return Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:AES256Encrypt %s, stack: %s",
        e,
        (e as Error).stack,
      );
      throw new CacheSecretException(
        "AES256 encrypt fail",
        (e as Error).message,
      );
    }
  }

  /**
   * 使用AES解密数据
   * @param mode 加密模式
   * @param data 加密的数据
   * @param secret 密钥
   * @param iv 初始化向量
   * @param salt 盐值
   * @returns 解密后的数据
   */
  static decrypt(
    mode: string,
    data: Uint8Array,
    secret: Uint8Array,
    iv: Uint8Array,
    salt: string,
  ): string {
    try {
      const algorithm =
        AESConst.CIPHER_MODE_MAP[mode] || AESConst.DEFAULT_CIPHER_MODE;

      // 与Java保持一致：将secret转为字符串，salt转为字节数组
      const key = crypto.pbkdf2Sync(
        Buffer.from(new TextDecoder().decode(secret)),
        Buffer.from(salt),
        AESConst.DEFAULT_ITERATIONS,
        AESConst.KEY_LENGTH / 8,
        AESConst.PBKDF2_HASH_ALGORITHM,
      );

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(data)),
        decipher.final(),
      ]);

      return decrypted.toString(CacheClientConstant.UTF8_ENCODING);
    } catch (e) {
      CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
        "action:AES256Decrypt %s, stack: %s",
        e,
        (e as Error).stack,
      );
      throw new CacheSecretException(
        "AES256 decrypt fail",
        (e as Error).message,
      );
    }
  }
}
