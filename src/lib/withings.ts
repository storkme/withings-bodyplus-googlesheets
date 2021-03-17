import * as crypto from "crypto";
import fetch from "node-fetch";
import { OAuth, WithingsResponse } from './types';

export function withingsClient() {
  let accessToken: string | undefined = process.env.WITHINGS_USER_ACCESS_TOKEN;
  let accessTokenExpiresAt: number | undefined = process.env.WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT ? parseInt(process.env.WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT) : undefined;
  let refreshToken: string | undefined = process.env.WITHINGS_USER_REFRESH_TOKEN;
  const getToken = async () => {
    if (accessToken && accessTokenExpiresAt! > Date.now()) {
      return accessToken;
    } else if (refreshToken && accessTokenExpiresAt! <= Date.now()) {
      const {
        body: {
          refresh_token,
          access_token,
          expires_in
        }
      } = await apiCall<OAuth>('https://wbsapi.withings.net/v2/oauth2', {
        action: 'requesttoken',
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      accessTokenExpiresAt = Date.now() + parseInt(expires_in) * 1000;
      accessToken = access_token;
      refreshToken = refresh_token;
      return accessToken;
    } else {
      const {
        body: {
          refresh_token,
          access_token,
          expires_in
        }
      } = await apiCall<OAuth>('https://wbsapi.withings.net/v2/oauth2', {
        action: 'requesttoken',
        grant_type: 'refresh_token',
        refresh_token: refreshToken!!
      });
      accessTokenExpiresAt = Date.now() + parseInt(expires_in) * 1000;
      accessToken = access_token;
      refreshToken = refresh_token;
      return accessToken;
    }
  };

  return {
    async getAccessToken(code: string) {
      await fetch(`https://wbsapi.withings.net/v2/oauth2`, {
        method: "POST",
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          action: "requesttoken",
          grant_type: "access_token",
          client_id: process.env.WITHINGS_CLIENT_ID!!,
          client_secret: process.env.WITHINGS_CLIENT_SECRET!!,
          redirect_uri: `https://withings-bodyplus-googlesheets.not.gd/callback`,
        }),
      })
    },
    async getMeasures(startDate: number, endDate: number) {
      const result = await apiCall('https://wbsapi.withings.net/measure', {
        action: 'getmeas',
        meastypes: '1,5,6,8,76,77,88',

      }, await getToken());

      if (result?.status == 0) {
        return result.body;
      }
    },
    async subscribe() {
      return apiCall(
        "https://wbsapi.withings.net/notify",
        {
          action: "subscribe",
          callbackurl: `https://withings-bodyplus-googlesheets.not.gd/callback`,
          appli: "1",
        },
        await getToken(),
      );
    }
  };
}

/**
 * Calculate the signature as per https://developer.withings.com/oauth2/#section/Device-and-Logistics-API/4.-Authentication
 */
export function getSignature(
  opts: { action: string } & Record<string, string>
): string {
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

export async function apiCall<T>(
  url: string,
  params: { action: string } & Record<string, string>,
  accessToken?: string,
): Promise<WithingsResponse<T>> {
  const nonce = await getNonce();
  const signature = getSignature({ action: params.action, nonce });

  return await (
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: new URLSearchParams({
        ...params,
        signature,
        client_id: process.env.WITHINGS_CLIENT_ID!!,
        nonce,
      }).toString(),
    })
  ).json() as WithingsResponse<T>;
}

export async function getNonce(): Promise<string> {
  const opts = {
    action: "getnonce",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    client_id: process.env.WITHINGS_CLIENT_ID!!,
  };
  const signature = getSignature(opts);

  const response = await (
    await fetch("https://wbsapi.withings.net/v2/signature", {
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

  console.error('IT TOTALLY FAILED:', response);

  throw Object.assign(new Error("Failed to get nonce"), response);
}
