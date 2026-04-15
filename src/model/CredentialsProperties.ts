import { RegionInfo } from "./RegionInfo";
import * as credentials from "@alicloud/credentials";

export class CredentialsProperties {
  private _provider?: credentials.CredentialsProvider;
  private _regionInfoList?: RegionInfo[];
  private _sourceProperties?: Record<string, string>;

  get provider(): credentials.CredentialsProvider | undefined {
    return this._provider;
  }

  set provider(value: credentials.CredentialsProvider | undefined) {
    this._provider = value;
  }

  get regionInfoList(): RegionInfo[] | undefined {
    return this._regionInfoList;
  }

  set regionInfoList(value: RegionInfo[] | undefined) {
    this._regionInfoList = value;
  }

  get sourceProperties(): Record<string, string> | undefined {
    return this._sourceProperties;
  }

  set sourceProperties(value: Record<string, string> | undefined) {
    this._sourceProperties = value;
  }
}
