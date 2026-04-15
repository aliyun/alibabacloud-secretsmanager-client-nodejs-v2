/**
 * 凭据缓存异常类
 */
export class CacheSecretException extends Error {
  private readonly _cause?: Error;

  constructor(message: string, cause?: any) {
    super(message);
    this.name = "CacheSecretException";

    if (cause instanceof Error) {
      this._cause = cause;
    }
    Object.setPrototypeOf(this, CacheSecretException.prototype);
  }

  getCause(): Error | undefined {
    return this._cause;
  }
  toString(): string {
    return `${this.name}: ${this.message}${
      this._cause ? `\nCaused by: ${this._cause.toString()}` : ""
    }`;
  }
}
