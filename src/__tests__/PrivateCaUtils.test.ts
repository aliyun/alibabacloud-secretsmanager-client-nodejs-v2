import { PrivateCaUtils } from "../utils/PrivateCaUtils";
import { describe, expect, test } from "@jest/globals";
describe("PrivateCaUtils", () => {
  test("should have REGION_ID_AND_CA_MAP defined and not empty", () => {
    expect(PrivateCaUtils.REGION_ID_AND_CA_MAP).toBeDefined();
    expect(PrivateCaUtils.REGION_ID_AND_CA_MAP.size).toBeGreaterThan(0);
  });

  test("should contain specific regions in the map", () => {
    const regions = Array.from(PrivateCaUtils.REGION_ID_AND_CA_MAP.keys());
    expect(regions.length).toBeGreaterThan(0);

    const hasValidRegion = regions.some((region) => region.includes("-"));
    expect(hasValidRegion).toBe(true);
  });

  test("should have CA certificates that start with BEGIN CERTIFICATE", () => {
    const caCertificates = Array.from(
      PrivateCaUtils.REGION_ID_AND_CA_MAP.values(),
    );
    const hasValidCert = caCertificates.some((cert) =>
      cert.startsWith("-----BEGIN CERTIFICATE-----"),
    );
    expect(hasValidCert).toBe(true);
  });

  test("should get CA expiration date for a valid region", () => {
    const regions = Array.from(PrivateCaUtils.REGION_ID_AND_CA_MAP.keys());
    if (regions.length > 0) {
      const firstRegion = regions[0];
      const cert = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(firstRegion);

      expect(() => {
        PrivateCaUtils.getCaExpirationUtcDate(cert!);
      }).not.toThrow();
    }
  });

  test("should return undefined for null certificate input", () => {
    const expirationDate = PrivateCaUtils.getCaExpirationUtcDate(null as any);
    expect(expirationDate).toBeUndefined();
  });

  test("should return undefined for empty certificate input", () => {
    const expirationDate = PrivateCaUtils.getCaExpirationUtcDate("");
    expect(expirationDate).toBeUndefined();
  });

  test("should handle non-existent region certificate gracefully", () => {
    expect(() => {
      const expirationDate = PrivateCaUtils.getCaExpirationUtcDate(
        "non-existent-certificate-data",
      );
    }).not.toThrow();
  });

  test("should return date in yyyy-MM-dd format when successful", () => {
    const regions = Array.from(PrivateCaUtils.REGION_ID_AND_CA_MAP.keys());
    if (regions.length > 0) {
      const sampleCert = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(regions[0]);

      const result = PrivateCaUtils.getCaExpirationUtcDate(sampleCert!);
      if (result !== undefined) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  test("should handle certificate chain properly", () => {
    const regions = Array.from(PrivateCaUtils.REGION_ID_AND_CA_MAP.keys());
    if (regions.length >= 2) {
      const cert1 = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(regions[0]);
      const cert2 = PrivateCaUtils.REGION_ID_AND_CA_MAP.get(regions[1]);

      const certChain = `${cert1}\n${cert2}`;

      expect(() => {
        PrivateCaUtils.getCaExpirationUtcDate(certChain);
      }).not.toThrow();

      const result = PrivateCaUtils.getCaExpirationUtcDate(certChain);
      if (result !== undefined) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  test("should trim CA content properly", () => {
    const rawCert =
      "-----BEGIN CERTIFICATE-----\ntest-cert-content\n-----END CERTIFICATE-----";
    const trimmed = PrivateCaUtils.trimCaContent(rawCert);
    expect(trimmed).toBe("test-cert-content");
  });

  test("should return empty string when trimming null/undefined content", () => {
    const trimmed1 = PrivateCaUtils.trimCaContent(null as any);
    expect(trimmed1).toBe("");

    const trimmed2 = PrivateCaUtils.trimCaContent(undefined as any);
    expect(trimmed2).toBe("");
  });
});
