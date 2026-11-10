import { format as formatString } from "util";

/**
 * mauth 日志包装接口
 */
export interface Wrapper {
  debug(format: string, ...args: any[]): void;
  info(format: string, ...args: any[]): void;
  warn(format: string, ...args: any[]): void;
  error(format: string, ...args: any[]): void;
}

/**
 * 默认日志实现，输出到 stderr
 */
export class DefaultLogger implements Wrapper {
  debug(format: string, ...args: any[]): void {
    process.stderr.write(`[Debug] ${formatString(format, ...args)}\n`);
  }

  info(format: string, ...args: any[]): void {
    process.stderr.write(`[Info] ${formatString(format, ...args)}\n`);
  }

  warn(format: string, ...args: any[]): void {
    process.stderr.write(`[Warn] ${formatString(format, ...args)}\n`);
  }

  error(format: string, ...args: any[]): void {
    process.stderr.write(`[Error] ${formatString(format, ...args)}\n`);
  }
}
