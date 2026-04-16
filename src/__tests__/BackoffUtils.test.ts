import { BackoffUtils } from "../utils/BackoffUtils";
import { CacheClientConstant } from "../utils/CacheClientConstant";

describe("BackoffUtils", () => {
  describe("judgeNeedBackoff", () => {
    it("should return true for Rejected.Throttling error", () => {
      const error = { code: "Rejected.Throttling" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(true);
    });

    it("should return true for ServiceUnavailableTemporary error", () => {
      const error = { code: "ServiceUnavailableTemporary" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(true);
    });

    it("should return true for InternalFailure error", () => {
      const error = { code: "InternalFailure" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(true);
    });

    it("should return false for other error codes", () => {
      const error = { code: "SomeOtherError" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(false);
    });

    it("should return false for null or undefined error", () => {
      expect(BackoffUtils.judgeNeedBackoff(null)).toBe(false);
      expect(BackoffUtils.judgeNeedBackoff(undefined)).toBe(false);
    });

    it("should return false for error without code property", () => {
      const error = { message: "Some error message" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(false);
    });

    it("should return false for error with empty code", () => {
      const error = { code: "" };
      expect(BackoffUtils.judgeNeedBackoff(error)).toBe(false);
    });
  });

  describe("judgeNeedRecoveryException", () => {
    it("should return true for ClientError with throttling code", () => {
      const error = { name: "ClientError", code: "Rejected.Throttling" };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(true);
    });

    it("should return true for ClientError with service unavailable code", () => {
      const error = {
        name: "ClientError",
        code: "ServiceUnavailableTemporary",
      };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(true);
    });

    it("should return true for ClientError with internal failure code", () => {
      const error = { name: "ClientError", code: "InternalFailure" };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(true);
    });

    it("should return true for SDK read timeout error", () => {
      const error = { name: CacheClientConstant.SDK_READ_TIMEOUT };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(true);
    });

    it("should return true for ECONNREFUSED error code", () => {
      const error = {
        name: "Error",
        code: CacheClientConstant.ECONNREFUSED_ERROR_CODE,
      };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(true);
    });

    it("should return false for ClientError with non-throttling code", () => {
      const error = { name: "ClientError", code: "SomeOtherError" };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(false);
    });

    it("should return false for error without name property", () => {
      const error = { code: "SomeCode" };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(false);
    });

    it("should return false for error with non-string name", () => {
      const error = { name: 123 };
      expect(BackoffUtils.judgeNeedRecoveryException(error)).toBe(false);
    });

    it("should return false for null or undefined error", () => {
      expect(BackoffUtils.judgeNeedRecoveryException(null)).toBe(false);
      expect(BackoffUtils.judgeNeedRecoveryException(undefined)).toBe(false);
    });
  });
});
