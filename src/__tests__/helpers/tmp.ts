import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * 临时文件工具（各测试文件共用）
 *
 * createTempFile 创建的临时目录会被记录，测试文件在 afterEach 中
 * 调用 cleanupTempFiles 统一清理。
 */
const tempDirs: string[] = [];

/** 创建临时文件并返回其路径（内容为 content，默认空串） */
export function createTempFile(prefix: string, content?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  const file = path.join(dir, "temp_file");
  fs.writeFileSync(file, content ?? "");
  return file;
}

/** 清理 createTempFile 创建的全部临时目录（幂等，可在 afterEach 调用） */
export function cleanupTempFiles(): void {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  }
}
