import { PingUtils } from "../utils/PingUtils";
import {
  describe,
  expect,
  test,
} from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
promisify(exec);
describe("PingUtils", () => {
  test("should return a number when ping is successful", async () => {
    const result = await PingUtils.ping("127.0.0.1");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(-1);
  });

  test("should return -1 when ping fails", async () => {
    const result = await PingUtils.ping("kms.hangzhou.aliyuncs.com");
    expect(result).toBe(-1);
  });

  test("should return -1 when ping times out", async () => {
    const result = await PingUtils.ping("10.255.255.1");
    expect(result).toBe(-1);
  });

  test("should handle invalid addresses gracefully", async () => {
    const result = await PingUtils.ping("invalid-address");
    expect(result).toBe(-1);
  });

  test("should handle empty address", async () => {
    const result = await PingUtils.ping("");
    expect(result).toBe(-1);
  });

  test("should parse Windows ping result correctly", () => {
    const windowsOutput = `
Pinging 8.8.8.8 with 32 bytes of data:
Reply from 8.8.8.8: bytes=32 time=24ms TTL=115
Ping statistics for 8.8.8.8:
    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 24ms, Maximum = 24ms, Average = 24ms
`;

    const result = PingUtils.parsePingResult(windowsOutput, true);
    expect(result).toBe(24);
  });

  test("should parse Windows ping result with decimal correctly", () => {
    const windowsOutput = `
Pinging 8.8.8.8 with 32 bytes of data:
Reply from 8.8.8.8: bytes=32 time=24.34ms TTL=115
Ping statistics for 8.8.8.8:
    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 24.34ms, Maximum = 24.34ms, Average = 24.34ms
`;

    const result = PingUtils.parsePingResult(windowsOutput, true);
    expect(result).toBe(24.34);
  });

  test("should parse Unix/Linux ping result correctly", () => {
    const unixOutput = `
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=115 time=15.2 ms

--- 8.8.8.8 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 15.2/15.2/15.2/0.0 ms
`;

    const result = PingUtils.parsePingResult(unixOutput, false);
    expect(result).toBe(15.2);
  });

  test("should parse Unix/Linux ping result with whole number correctly", () => {
    const unixOutput = `
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=115 time=15 ms

--- 8.8.8.8 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 15/15/15/0.0 ms
`;

    const result = PingUtils.parsePingResult(unixOutput, false);
    expect(result).toBe(15);
  });

  test("should return -1 when no ping time found in output", () => {
    const outputWithoutTime = `
PING google.com (142.250.180.14) 56(84) bytes of data.
Request timeout for icmp_seq 1

--- google.com ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms
`;

    const result = PingUtils.parsePingResult(outputWithoutTime, false);
    expect(result).toBe(-1);
  });

  test("should return -1 when ping output is empty", () => {
    const result = PingUtils.parsePingResult("", false);
    expect(result).toBe(-1);
  });

  test("should return -1 when ping output is null/undefined", () => {
    const result1 = PingUtils.parsePingResult(null as any, false);
    expect(result1).toBe(-1);

    const result2 = PingUtils.parsePingResult(undefined as any, false);
    expect(result2).toBe(-1);
  });

  test("should handle regex match returning null", () => {
    const result = PingUtils.parsePingResult("no time pattern here", false);
    expect(result).toBe(-1);
  });

  test("should handle different ping time formats", () => {
    const outputs = [
      { output: "time=12ms", platform: true, expected: 12 },
      { output: "time=12.567ms", platform: true, expected: 12.567 },
      { output: "time=12 ms", platform: false, expected: 12 },
      { output: "time=12.567 ms", platform: false, expected: 12.567 },
    ];

    outputs.forEach(({ output, platform, expected }) => {
      const result = PingUtils.parsePingResult(output, platform);
      expect(result).toBe(expected);
    });
  });

  test("should handle edge cases in parsing", () => {
    const edgeCases = [
      { output: "=100ms", platform: true, expected: 100 },
      { output: "some text =50.5ms more text", platform: true, expected: 50.5 },
      { output: "TIME=75MS", platform: true, expected: 75 },
    ];

    edgeCases.forEach(({ output, platform, expected }) => {
      const result = PingUtils.parsePingResult(output, platform);
      expect(result).toBe(expected);
    });
  });
});
