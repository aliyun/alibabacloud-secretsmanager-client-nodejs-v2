/**
 * 缓存客户端构建器接口
 */
export interface CacheClientBuilder<T> {
  /**
   * 构建T对象，同时对T对象实例进行初始化
   * @returns T对象
   */
  build(): T;
}
