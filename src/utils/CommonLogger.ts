import { CacheClientConstant } from './CacheClientConstant';

/**
 * 通用日志记录器
 */
export class CommonLogger {
  private static commonLoggerMap: Map<string, CommonLogger> = new Map();
  /**
   * 有效模块
   */
  private static allowModes: string[] = [CacheClientConstant.MODE_NAME];

  private logger: Console;
  private readonly modeName: string;

  private constructor(modeName: string, logger: Console) {
    this.logger = logger;
    this.modeName = modeName;
  }

  /**
   * 注册logger
   *
   * @param modeName
   * @param logger
   */
  static registerLogger(modeName: string, logger: Console): void {
    if (!CommonLogger.allowModes.includes(modeName)) {
      throw new Error(`the modeName [${modeName}] is invalid`);
    }
    CommonLogger.commonLoggerMap.set(
      modeName,
      new CommonLogger(modeName, logger),
    );
  }

  /**
   * 获取commonLogger
   *
   * @param modeName
   * @returns
   */
  static getCommonLogger(modeName: string): CommonLogger {
    if (!CommonLogger.commonLoggerMap.has(modeName)) {
      throw new Error(`the modeName [${modeName}] need register`);
    }
    return CommonLogger.commonLoggerMap.get(modeName)!;
  }

  /**
   * 是否注册commonLogger
   *
   * @param modeName
   * @returns
   */
  static isRegistered(modeName: string): boolean {
    return CommonLogger.commonLoggerMap.has(modeName);
  }

  tracef(format: string, ...parameters: any[]): void {
    this.logger.trace(`[${this.modeName}] ${format}`, ...parameters);
  }

  /**
   * 以下 debug/info/warn/error 为非 f 后缀别名，
   * 使 CommonLogger 可直接满足 mauth logger.Wrapper 接口
   */
  debug(format: string, ...parameters: any[]): void {
    this.debugf(format, ...parameters);
  }

  info(format: string, ...parameters: any[]): void {
    this.infof(format, ...parameters);
  }

  warn(format: string, ...parameters: any[]): void {
    this.warnf(format, ...parameters);
  }

  error(format: string, ...parameters: any[]): void {
    this.errorf(format, ...parameters);
  }

  infof(format: string, ...parameters: any[]): void {
    this.logger.info(`[${this.modeName}] ${format}`, ...parameters);
  }

  debugf(format: string, ...parameters: any[]): void {
    this.logger.debug(`[${this.modeName}] ${format}`, ...parameters);
  }

  warnf(format: string, ...parameters: any[]): void {
    this.logger.warn(`[${this.modeName}] ${format}`, ...parameters);
  }

  errorf(format: string, ...parameters: any[]): void {
    this.logger.error(`[${this.modeName}] ${format}`, ...parameters);
  }

  close?(): void {
    // do nothing
  }
}