import { FullJitterBackoffStrategy } from "../service/FullJitterBackoffStrategy";
import { describe, expect, test } from "@jest/globals";

describe("FullJitterBackoffStrategy", () => {
  test("should initialize with default parameters", () => {
    const strategy = new FullJitterBackoffStrategy();
    expect(strategy).toBeDefined();
  });

  test("should initialize with custom parameters", () => {
    const strategy = new FullJitterBackoffStrategy(5, 1000, 30000);
    expect(strategy).toBeDefined();
  });

  test("should calculate exponential wait time", () => {
    const strategy = new FullJitterBackoffStrategy(3, 1000, 10000);
    strategy.init();

    const waitTime0 = strategy.getWaitTimeExponential(0);
    const waitTime1 = strategy.getWaitTimeExponential(1);
    const waitTime2 = strategy.getWaitTimeExponential(2);
    const waitTime3 = strategy.getWaitTimeExponential(3);
    const waitTime4 = strategy.getWaitTimeExponential(4);

    expect(typeof waitTime0).toBe("number");
    expect(typeof waitTime1).toBe("number");
    expect(typeof waitTime2).toBe("number");
    expect(typeof waitTime3).toBe("number");
    expect(typeof waitTime4).toBe("number");

    expect(waitTime4).toBe(-1);
  });

  test("should return -1 when exceeding max attempts", () => {
    const strategy = new FullJitterBackoffStrategy(3, 1000, 10000);
    strategy.init();

    const waitTime = strategy.getWaitTimeExponential(4);
    expect(waitTime).toBe(-1);
  });

  test("should handle boundary conditions", () => {
    const strategyWithZeroInterval = new FullJitterBackoffStrategy(3, 0, 10000);
    strategyWithZeroInterval.init();
    const waitTime = strategyWithZeroInterval.getWaitTimeExponential(1);
    expect(typeof waitTime).toBe("number");

    const strategyWithZeroCapacity = new FullJitterBackoffStrategy(3, 1000, 0);
    strategyWithZeroCapacity.init();
    const waitTime2 = strategyWithZeroCapacity.getWaitTimeExponential(1);
    expect(typeof waitTime2).toBe("number");
  });

  test("should initialize default values properly", () => {
    const strategy = new FullJitterBackoffStrategy();
    strategy.init();

    const waitTime = strategy.getWaitTimeExponential(0);
    expect(typeof waitTime).toBe("number");
    expect(waitTime).toBeGreaterThanOrEqual(-1);
  });

  test("should work with maximum retry attempts", () => {
    const strategy = new FullJitterBackoffStrategy(1, 1000, 10000);
    strategy.init();

    const validWaitTime = strategy.getWaitTimeExponential(1);
    expect(typeof validWaitTime).toBe("number");
    expect(validWaitTime).toBeGreaterThanOrEqual(0);

    const exceededWaitTime = strategy.getWaitTimeExponential(2);
    expect(exceededWaitTime).toBe(-1);
  });
});
