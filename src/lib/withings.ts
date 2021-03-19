import * as crypto from "crypto";
import fetch from "node-fetch";
import { OAuth, OAuthResponse } from "./types";

/**
 * This file uses the following env vars:
 * WITHINGS_USER_ACCESS_TOKEN
 * WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT
 * WITHINGS_USER_REFRESH_TOKEN
 * WITHINGS_CLIENT_ID
 * WITHINGS_CLIENT_SECRET
 * WITHINGS_CALLBACK_URL
 */
export default class WithingsClient {
  static readonly baseUrl = "https://wbsapi.withings.net";
  accessToken: string | undefined = process.env.WITHINGS_USER_ACCESS_TOKEN;
  accessTokenExpiresAt: number | undefined = process.env
    .WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT
    ? parseInt(process.env.WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT)
    : undefined;
  refreshToken: string | undefined = process.env.WITHINGS_USER_REFRESH_TOKEN;

  constructor() {}

  private saveAuth({ expires_in, access_token, refresh_token }: OAuthResponse) {
    this.accessTokenExpiresAt = Date.now() + (parseInt(expires_in) * 1000);
    this.accessToken = access_token;
    this.refreshToken = refresh_token;
  }

  private readonly callback = process.env.WITHINGS_CALLBACK_URL!!;

  /**
   * https://developer.withings.com/oauth2/#operation/oauth2-authorize
   * @param code
   */
  async getAccessToken(code: string) {
    const auth = await this.apiCall<OAuth>(`/v2/oauth2`, {
      code,
      action: "requesttoken",
      grant_type: "access_token",
      client_id: process.env.WITHINGS_CLIENT_ID!!,
      client_secret: process.env.WITHINGS_CLIENT_SECRET!!,
      redirect_uri: this.callback,
    }, false);

    console.log('got result from /v2/oauth2', auth);

    this.saveAuth(auth);
    return auth;
  }

  async getMeasures(startdate: string, enddate: string) {
    return this.apiCall("/measure", {
      action: "getmeas",
      meastypes: "1,5,6,8,76,77,88",
      startdate,
      enddate,
    });
  }

  async subscribe() {
    return this.apiCall("/notify", {
      action: "subscribe",
      callbackurl: this.callback,
      appli: "1",
    });
  }

  /**
   * Calculate the signature as per https://developer.withings.com/oauth2/#section/Device-and-Logistics-API/4.-Authentication
   */
  getSignature(opts: { action: string } & Record<string, string>): string {
    return crypto
      .createHmac("sha256", process.env.WITHINGS_CLIENT_SECRET!! as string)
      .update(
        Object.entries({
          ...opts,
          client_id: process.env.WITHINGS_CLIENT_ID!!,
        })
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, values]) => values)
          .join(",")
      )
      .digest("hex");
  }

  async apiCall<T>(
    endpoint: string,
    params: { action: string } & Record<string, string>,
    auth = true
  ): Promise<T> {
    const nonce = await this.getNonce();
    const signature = this.getSignature({ action: params.action, nonce });
    const Authorization = auth ? `Bearer ${await this.getToken()}` : undefined;
    const reqBody={
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        ...(Authorization && { Authorization }),
      },
      body: new URLSearchParams({
        ...params,
        signature,
        client_id: process.env.WITHINGS_CLIENT_ID!!,
        nonce,
      }).toString(),
    };
    console.log('request body', reqBody);

    const response = await (
      await fetch(new URL(endpoint, WithingsClient.baseUrl).href, reqBody)
    ).json();

    console.log('response body', response);

    if (response.status === 0) {
      return response.body;
    } else {
      throw Object.assign(
        new Error(`call to ${endpoint} failed: ${response.status}`),
        { response }
      );
    }
  }

  private async getNonce(): Promise<string> {
    const opts = {
      action: "getnonce",
      timestamp: Math.floor(Date.now() / 1000).toString(),
      client_id: process.env.WITHINGS_CLIENT_ID!!,
    };
    const signature = this.getSignature(opts);

    const response = await (
      await fetch(new URL("/v2/signature",WithingsClient.baseUrl).href, {
        method: "POST",
        body: new URLSearchParams({
          ...opts,
          signature,
        }),
      })
    ).json();

    if (response.status === 0) {
      return response.body.nonce;
    }

    throw Object.assign(new Error("Failed to get nonce"), response);
  }

  private async getToken(): Promise<string | undefined> {
    if (this.accessToken && this.accessTokenExpiresAt! > Date.now()) {
      return this.accessToken;
    } else if (this.refreshToken && this.accessTokenExpiresAt! <= Date.now()) {
      const {
        refresh_token,
        access_token,
        expires_in,
      } = await this.apiCall<OAuth>("/v2/oauth2", {
        action: "requesttoken",
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_secret: process.env.WITHINGS_CLIENT_SECRET!!,
      }, false);
      this.accessTokenExpiresAt = Date.now() + parseInt(expires_in) * 1000;
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      return this.accessToken;
    }
  }
}
