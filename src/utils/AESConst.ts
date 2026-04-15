/**
 * AES加密常量类
 */
export class AESConst {
  // AES 256 CBC模式密钥
  static readonly AES_256_CBC_MODE_KEY = "001";

  // 默认迭代次数
  static readonly DEFAULT_ITERATIONS = 65536;

  // 密钥长度
  static readonly KEY_LENGTH = 256;

  // 默认加密模式 - Node.js兼容格式
  static readonly DEFAULT_CIPHER_MODE = "aes-256-cbc";

  // IV长度
  static readonly IV_LENGTH = 16;

  // 随机密钥长度
  static readonly RANDOM_KEY_LENGTH = 32;

  // 加密模式映射表
  static readonly CIPHER_MODE_MAP: { [key: string]: string } = {
    [AESConst.AES_256_CBC_MODE_KEY]: AESConst.DEFAULT_CIPHER_MODE,
  };

  // PBKDF2哈希算法
  static readonly PBKDF2_HASH_ALGORITHM = "sha256";
}
