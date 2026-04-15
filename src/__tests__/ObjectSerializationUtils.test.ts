import { ObjectSerializationUtils } from "../utils/ObjectSerializationUtils";
import { CacheSecretInfo } from "../model/CacheSecretInfo";
import { SecretInfo } from "../model/SecretInfo";
import { CacheClientConstant } from "../index";
import fs from "fs-extra";
import path from "path";

describe("ObjectSerializationUtils", () => {
  const testDir = path.join(__dirname, "../..", "test-serialization-utils");

  beforeEach(async () => {
    // 清理并重新创建测试目录
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
    await fs.ensureDir(testDir);
    
    // 等待一段时间确保目录创建完成
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // 确保测试完成后清理测试目录
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe("writeObject", () => {
    it("should write object to JSON file", async () => {
      const testData = { name: "test", value: 123 };
      const fileName = "test-data.json";

      const filePath = path.join(testDir, fileName);
      
      // 执行写入操作
      await ObjectSerializationUtils.writeObject(testDir, fileName, testData);
      
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 检查文件是否存在
      const fileExists = fs.pathExistsSync(filePath);
      expect(fileExists).toBe(true);

      const writtenData = await fs.readJson(filePath);
      expect(writtenData).toEqual(testData);
    });

    it("should create directory if it does not exist", async () => {
      const newDir = path.join(testDir, "new-dir");
      const testData = { name: "test" };
      const fileName = "test-data.json";

      const filePath = path.join(newDir, fileName);
      
      // 执行写入操作（这应该创建新目录）
      await ObjectSerializationUtils.writeObject(newDir, fileName, testData);
      
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 检查文件是否存在
      const fileExists = fs.pathExistsSync(filePath);
      expect(fileExists).toBe(true);
    });
  });

  describe("readObject", () => {
    it("should read object from JSON file", async () => {
      const originalData = { name: "test", value: 123 };
      const fileName = "read-test.json";
      const filePath = path.join(testDir, fileName);

      await fs.writeJson(filePath, originalData, { spaces: 2 });

      const result = ObjectSerializationUtils.readObject(
        testDir,
        fileName,
        class {},
      );
      expect(result).toBeDefined();
    });

    it("should return undefined if file does not exist", () => {
      const result = ObjectSerializationUtils.readObject(
        testDir,
        "nonexistent.json",
        Object,
      );
      expect(result).toBeUndefined();
    });

    it("should handle CacheSecretInfo deserialization", async () => {
      const secretInfo = new SecretInfo(
        "test-secret",
        "v1",
        "secret-value",
        "text",
        "2023-01-01T00:00:00Z",
        "Generic",
        "Disabled",
        "{}",
        "30d",
        "2023-02-01T00:00:00Z",
      );

      const cacheSecretInfo = new CacheSecretInfo(
        secretInfo,
        CacheClientConstant.STAGE_ACS_CURRENT,
        Date.now(),
      );

      const fileName = "cache-secret-info.json";
      await ObjectSerializationUtils.writeObject(
        testDir,
        fileName,
        cacheSecretInfo,
      );
      
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const readCacheSecretInfo = ObjectSerializationUtils.readObject(
        testDir,
        fileName,
        CacheSecretInfo,
      );

      expect(readCacheSecretInfo).toBeDefined();
      expect(readCacheSecretInfo).toBeInstanceOf(CacheSecretInfo);

      if (readCacheSecretInfo) {
        const readSecretInfo = readCacheSecretInfo.getSecretInfo();
        expect(readSecretInfo).toBeInstanceOf(SecretInfo);
        expect(readSecretInfo.getSecretName()).toBe("test-secret");
        expect(readSecretInfo.getSecretValue()).toBe("secret-value");
      }
    });
  });

  describe("exists", () => {
    it("should return true if file exists", async () => {
      const fileName = "exist-test.json";
      const filePath = path.join(testDir, fileName);
      await fs.writeJson(filePath, { test: "data" });
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = ObjectSerializationUtils.exists(testDir, fileName);
      expect(result).toBe(true);
    });

    it("should return false if file does not exist", () => {
      const result = ObjectSerializationUtils.exists(
        testDir,
        "nonexistent.json",
      );
      expect(result).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete existing file", async () => {
      const fileName = "delete-test.json";
      const filePath = path.join(testDir, fileName);
      await fs.writeJson(filePath, { test: "data" });
      // 等待文件系统操作完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 验证文件是否确实存在
      const fileExistsBeforeDelete = fs.pathExistsSync(filePath);
      expect(fileExistsBeforeDelete).toBe(true);

      ObjectSerializationUtils.delete(testDir, fileName);

      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it("should not throw error if file does not exist", () => {
      expect(() => {
        ObjectSerializationUtils.delete(testDir, "nonexistent.json");
      }).not.toThrow();
    });
  });
});
