import * as forge from "node-forge";

/**
 * ClientKey 提取结果
 */
export interface ClientKeyExtractResult {
  /** 私钥 PEM 内容 */
  privateKeyPem: string;
  /** 证书过期时间 */
  expiresAt: Date;
}

/**
 * 从 PKCS12 格式的 ClientKey 私钥数据中提取私钥 PEM 与过期时间
 * @param password PKCS12 密码
 * @param privateKeyData base64 编码的 PKCS12 数据
 * @returns 私钥 PEM 与过期时间
 */
export function extractClientKey(
  password: string,
  privateKeyData: string,
): ClientKeyExtractResult {
  // base64 解码
  let derBinary: string;
  try {
    derBinary = forge.util.decode64(privateKeyData);
  } catch (e) {
    throw new Error(`base64 decode error: ${(e as Error).message}`);
  }

  // PKCS12 解析转 PEM 结构
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const p12Asn1 = forge.asn1.fromDer(derBinary);
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  } catch (e) {
    throw new Error(`pkcs12 to pem error: ${(e as Error).message}`);
  }

  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag!
    ] ?? [];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag!
    ] ?? [];
  if (certBags.length + keyBags.length < 2) {
    throw new Error("pkcs12 to pem error: blocks length less than 2");
  }

  const certBag = certBags.find((bag) => bag.cert !== undefined);
  if (!certBag || !certBag.cert) {
    throw new Error("pkcs12 to pem error: cert block is missing");
  }

  const keyBag = keyBags.find((bag) => bag.key !== undefined);
  if (!keyBag || !keyBag.key) {
    throw new Error("pkcs12 to pem error: key block is missing");
  }

  // 证书过期时间
  const expiresAt = certBag.cert.validity.notAfter;

  // 私钥转 PKCS8 PEM（输出标准 PRIVATE KEY 块）
  const privateKeyPem = forge.pki.privateKeyInfoToPem(
    forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(keyBag.key)),
  );

  return { privateKeyPem, expiresAt };
}
