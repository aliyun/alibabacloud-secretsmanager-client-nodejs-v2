import { describe, expect, test, afterEach, jest } from "@jest/globals";
import { DefaultLogger } from "../mauth/logger/Logger";

afterEach(() => {
  jest.restoreAllMocks();
});

function captureStderr(): jest.SpiedFunction<typeof process.stderr.write> {
  return jest
    .spyOn(process.stderr, "write")
    .mockImplementation((() => true) as any);
}

describe("DefaultLogger", () => {
  const logger = new DefaultLogger();

  test("TestDefaultLogger_Debug", () => {
    const spy = captureStderr();
    logger.debug("hello %s", "world");
    expect(spy).toHaveBeenCalledWith("[Debug] hello world\n");
  });

  test("TestDefaultLogger_Info", () => {
    const spy = captureStderr();
    logger.info("n=%d", 42);
    expect(spy).toHaveBeenCalledWith("[Info] n=42\n");
  });

  test("TestDefaultLogger_Warn", () => {
    const spy = captureStderr();
    logger.warn("careful");
    expect(spy).toHaveBeenCalledWith("[Warn] careful\n");
  });

  test("TestDefaultLogger_Error", () => {
    const spy = captureStderr();
    logger.error("boom %s", new Error("x").message);
    expect(spy).toHaveBeenCalledWith("[Error] boom x\n");
  });

  test("TestDefaultLogger_NoArgs", () => {
    const spy = captureStderr();
    logger.info("plain");
    expect(spy).toHaveBeenCalledWith("[Info] plain\n");
  });
});
