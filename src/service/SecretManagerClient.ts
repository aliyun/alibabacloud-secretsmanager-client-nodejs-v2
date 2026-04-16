import {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "@alicloud/kms20160120";

/**
 * Secret Manager客户端接口
 */
export interface SecretManagerClient {
  init(): Promise<void>;
  getSecretValue(
    request: GetSecretValueRequest,
  ): Promise<GetSecretValueResponse>;
  close(): void;
}
