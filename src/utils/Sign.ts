import * as crypto from "crypto";
import { CacheClientConstant } from "./CacheClientConstant";
import { CommonLogger } from "./CommonLogger";

export const HeaderDate = "Date";
export const HeaderApiVersion = "x-kms-apiversion";
export const HeaderApiName = "x-kms-apiname";
export const HeaderSignatureMethod = "x-kms-signaturemethod";
/** 注意：3 个 c 的 acccesskeyid 拼写为服务端契约，必须保留 */
export const HeaderAccessKeyId = "x-kms-acccesskeyid";
export const AlgoRsaPkcs1Sha256 = "RSA_PKCS1_SHA_256";
export const ActionGetSecretValue = "GetSecretValue";
export const ApiVersion20160102 = "2016-01-02";

/**
 * 签名参数提取结果
 */
export interface SignParams {
  queryParams: Record<string, string>;
  header: Record<string, string>;
}

/**
 * 获取日志记录器（未注册时回退默认 logger）
 */
function getSignLogger(): { errorf(format: string, ...args: any[]): void } {
  if (CommonLogger.isRegistered(CacheClientConstant.MODE_NAME)) {
    return CommonLogger.getCommonLogger(CacheClientConstant.MODE_NAME);
  }
  return {
    errorf: (format: string, ...args: any[]) =>
      console.error(format, ...args),
  };
}

/**
 * 提取签名参数：将请求对象序列化为查询参数，并构建签名请求头
 * @param param 请求对象（如 GetSecretValueRequest）
 * @param tokenId 令牌 KeyId
 * @param action API 名称
 */
export function extractSignParams(
  param: any,
  tokenId: string,
  action: string,
): SignParams {
  // 参数
  const queryParams: Record<string, string> = {};
  const header: Record<string, string> = {};

  let data: string;
  try {
    // Tea 模型使用 toMap() 输出 API 参数名（PascalCase）
    data = JSON.stringify(
      param && typeof param.toMap === "function" ? param.toMap() : param,
    );
  } catch (e) {
    getSignLogger().errorf("Error serializing JSON: %s", e);
    return { queryParams, header };
  }

  let m: Record<string, any>;
  try {
    m = JSON.parse(data);
  } catch (e) {
    getSignLogger().errorf("Error parsing JSON: %s", e);
    return { queryParams, header };
  }

  // 序列化结果为 null 时视为空参数集合
  for (const [k, v] of Object.entries(m ?? {})) {
    if (v !== null && v !== undefined && String(v) !== "") {
      queryParams[k] = String(v);
    }
  }

  // header
  header[HeaderAccessKeyId] = tokenId;
  header[HeaderSignatureMethod] = AlgoRsaPkcs1Sha256;
  // RFC3339 UTC 格式（秒精度）
  header[HeaderDate] = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  header[HeaderApiName] = action;
  header[HeaderApiVersion] = ApiVersion20160102;
  return { queryParams, header };
}

/**
 * 对查询参数与请求头合集进行签名
 * @param queryParams 查询参数
 * @param header 请求头
 * @param privateKey 私钥 PEM
 * @returns base64 编码的签名
 */
export function sign(
  queryParams: Record<string, string>,
  header: Record<string, string>,
  privateKey: string,
): string {
  // args 是 query 和 header 里合集
  const args: Record<string, string> = {};
  for (const [k, v] of Object.entries(queryParams)) {
    args[k] = v;
  }
  for (const [k, v] of Object.entries(header)) {
    args[k] = v;
  }
  const toSignString = buildStringToSign(args);
  // 签名
  return sha256WithRsa(toSignString, privateKey);
}

export function buildStringToSign(args: Record<string, string>): string {
  const keys = Object.keys(args);
  // 排序
  keys.sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = args[key];
    parts.push(`${percentEncode(key)}=${percentEncode(value)}`);
  }
  return parts.join("&");
}

/**
 * 百分号编码（规则：空格→%20、*→%2A、%7E→~，
 * 其余非 unreserved 字符全部转义）
 */
export function percentEncode(s: string): string {
  // encodeURIComponent: 空格→%20、~ 不转义；需额外转义 ! ' ( ) *
  return encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

/**
 * SHA256WithRSA 签名
 * @param source 待签名字符串
 * @param secret 私钥 PEM（PKCS1 或 PKCS8 格式）
 * @returns base64 编码的签名
 */
export function sha256WithRsa(source: string, secret: string): string {
  // 1. 校验 PEM 格式的数据
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(secret)) {
    throw new Error("failed to decode PEM block");
  }

  // 2. 解析私钥并签名（crypto 同时支持 PKCS1 与 PKCS8 PEM）
  let signatureBytes: Buffer;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(source, "utf8");
    signatureBytes = signer.sign(secret);
  } catch (e) {
    throw new Error(`failed to sign data: ${(e as Error).message}`);
  }
  return signatureBytes.toString("base64");
}
