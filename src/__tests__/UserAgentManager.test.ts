import { UserAgentManager } from "../service/UserAgentManager";
import { describe, expect, test, beforeEach } from "@jest/globals";

function resetUserAgentManager() {
  Object.defineProperty(UserAgentManager, "userAgent", {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(UserAgentManager, "priority", {
    value: 0,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(UserAgentManager, "projectVersion", {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

describe("UserAgentManager", () => {
  beforeEach(() => {
    resetUserAgentManager();
  });

  test("should return undefined values initially", () => {
    const userAgent = UserAgentManager.getUserAgent();
    expect(userAgent).toBeUndefined();
    expect(
      typeof userAgent === "string" || userAgent === undefined,
    ).toBeTruthy();
  });

  test("should register user agent with proper priority", () => {
    UserAgentManager.registerUserAgent("test-agent", 10, "2.0.0");
    const userAgent = UserAgentManager.getUserAgent();
    expect(userAgent).toBe("test-agent");

    const projectVersion = UserAgentManager.getProjectVersion();
    expect(projectVersion).toBe("2.0.0");
  });

  test("should not override registered agent when lower priority is provided", () => {
    UserAgentManager.registerUserAgent("high-priority-agent", 10, "2.0.0");
    UserAgentManager.registerUserAgent("low-priority-agent", 5, "1.0.0");

    const userAgent = UserAgentManager.getUserAgent();
    expect(userAgent).toBe("high-priority-agent");

    const projectVersion = UserAgentManager.getProjectVersion();
    expect(projectVersion).toBe("2.0.0");
  });

  test("should override registered agent when higher or equal priority is provided", () => {
    UserAgentManager.registerUserAgent("initial-agent", 5, "1.0.0");
    UserAgentManager.registerUserAgent("higher-priority-agent", 5, "3.0.0");

    const userAgent = UserAgentManager.getUserAgent();
    expect(userAgent).toBe("higher-priority-agent");

    const projectVersion = UserAgentManager.getProjectVersion();
    expect(projectVersion).toBe("3.0.0");
  });

  test("should handle equal priority updates", () => {
    UserAgentManager.registerUserAgent("first-agent", 7, "1.0.0");
    UserAgentManager.registerUserAgent("second-agent", 7, "2.0.0");

    const userAgent = UserAgentManager.getUserAgent();
    expect(userAgent).toBe("second-agent");

    const projectVersion = UserAgentManager.getProjectVersion();
    expect(projectVersion).toBe("2.0.0");
  });

  test("should return consistent values after registration", () => {
    UserAgentManager.registerUserAgent("consistent-test-agent", 15, "5.0.0");

    const userAgent1 = UserAgentManager.getUserAgent();
    const projectVersion1 = UserAgentManager.getProjectVersion();

    const userAgent2 = UserAgentManager.getUserAgent();
    const projectVersion2 = UserAgentManager.getProjectVersion();

    expect(userAgent1).toBe(userAgent2);
    expect(projectVersion1).toBe(projectVersion2);
    expect(userAgent1).toBe("consistent-test-agent");
    expect(projectVersion1).toBe("5.0.0");
  });
});
