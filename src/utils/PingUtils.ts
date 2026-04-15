import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class PingUtils {
  private constructor() {
    // do nothing
  }

  static async ping(addr: string): Promise<number> {
    try {
      const isWindows = process.platform === "win32";
      const command = isWindows ? `ping -n 1 ${addr}` : `ping -c 1 ${addr}`;

      const { stdout } = await execAsync(command, {
        timeout: 2000,
      });

      return this.parsePingResult(stdout, isWindows);
    } catch (error) {
      return -1;
    }
  }

  public static parsePingResult(output: string, isWindows: boolean): number {
    if (!output) {
      return -1;
    }

    const pattern = isWindows
      ? /=([0-9]+)(.[0-9]+)?ms/i // Windows: =(数字)(小数部分?)ms
      : /=([0-9]+)(.[0-9]+)? ms/i; // Unix/Linux: =(数字)(小数部分?) ms

    const regex = new RegExp(pattern);

    const match = output.match(regex);

    if (match && match[1]) {
      const firstGroup = match[1];
      const secondGroup = match[2];

      if (
        secondGroup !== undefined &&
        secondGroup !== null &&
        secondGroup.trim() !== ""
      ) {
        return parseFloat(firstGroup + secondGroup);
      } else {
        return parseFloat(firstGroup);
      }
    }
    return -1;
  }
}
