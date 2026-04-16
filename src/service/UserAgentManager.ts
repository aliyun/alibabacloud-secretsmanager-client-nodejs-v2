/**
 * User-Agent管理器
 */
export class UserAgentManager {
  private static userAgent: string | undefined;
  private static priority: number = 0;
  private static projectVersion: string | undefined;

  static getUserAgent(): string | undefined {
    return this.userAgent;
  }

  static getProjectVersion(): string | undefined {
    return this.projectVersion;
  }

  static registerUserAgent(
    userAgent: string,
    priority: number,
    projectVersion: string,
  ): void {
    if (priority >= UserAgentManager.priority) {
      UserAgentManager.userAgent = userAgent;
      UserAgentManager.priority = priority;
      UserAgentManager.projectVersion = projectVersion;
    }
  }
}
