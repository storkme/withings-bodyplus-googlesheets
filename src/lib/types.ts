/**
 * Represents an example request from withings to our callback
 *
 * e.g.:
 *
 * {
    userid: '25050334',
    startdate: '1615810963',
    enddate: '1615810964',
    appli: '1'
  }
 */
export interface SubscriptionRequest {
  userid: string,
  startdate: string;
  enddate: string;
  appli: string;
}

export interface OAuth {
  userid: string;
  access_token: string;
  refresh_token: string;
  expires_in: string;
  scope: string;
  csrf_token: string;
  token_type: string;
}

export const WITHINGS_USER_ACCESS_TOKEN = 'WITHINGS_USER_ACCESS_TOKEN';
