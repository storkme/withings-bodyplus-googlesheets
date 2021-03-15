import * as crypto from "crypto";
import fetch from "node-fetch";

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

export async function apiCall(
  url: string,
  accessToken: string,
  params: { action: string } & Record<string, string>
) {
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
  ).json();
}

export async function getNonce(): Promise<string> {
  const opts = {
    action: "getnonce",
    timestamp: Math.floor(Date.now() / 1000).toString(),
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

  throw Object.assign(new Error("Failed to get nonce"), response);
}
