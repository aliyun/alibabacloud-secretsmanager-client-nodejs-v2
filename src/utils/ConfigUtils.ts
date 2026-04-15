import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CommonLogger } from "./CommonLogger";
import { CacheClientConstant } from "./CacheClientConstant";

export class ConfigUtils {
  /**
   * 加载配置
   * @param configName 配置文件名
   * @returns 配置对象
   */
  static loadConfig(configName: string): Record<string, string> | undefined {
    const configFileLocations = ConfigUtils.getConfigFileLocations(configName);

    for (const location of configFileLocations) {
      if (ConfigUtils.exists(location)) {
        try {
          const content = fs.readFileSync(location, "utf8");
          const config: Record<string, string> = {};
          const lines = content.split(/\r?\n/);

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (
              trimmedLine &&
              !trimmedLine.startsWith("#") &&
              trimmedLine.includes("=")
            ) {
              const separatorIndex = trimmedLine.indexOf("=");
              const key = trimmedLine.substring(0, separatorIndex).trim();

              config[key] = trimmedLine.substring(separatorIndex + 1).trim();
            }
          }

          return config;
        } catch (error) {
          CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME).errorf(
            `Error reading config file ${location}: %s, stack: %s`,
            error,
            (error as Error).stack,
          );
          return undefined;
        }
      }
    }

    return undefined;
  }

  /**
   * 获取配置文件可能的位置
   * @param configName 配置文件名
   * @returns 配置文件路径数组
   */
  static getConfigFileLocations(configName: string): string[] {
    return [
      path.join(process.cwd(), "config", configName),
      path.join(process.cwd(), configName),
      path.join(os.homedir(), ".aliyun", configName),
      path.join(os.homedir(), configName),
    ];
  }

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 是否存在
   */
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
}
