import { CacheClientConstant } from "./CacheClientConstant";

/**
 * 字节缓冲区工具类
 */
export class ByteBufferUtils {
  private constructor() {
    // 私有构造函数，防止实例化
  }

  /**
   * 将字符串转换为字节缓冲区
   * @param str 输入字符串
   * @returns 字节缓冲区
   */
  static convertStringToByte(str?: string): Buffer {
    if (!str) {
      return Buffer.alloc(0);
    }
    return Buffer.from(str, CacheClientConstant.UTF8_ENCODING);
  }
}
