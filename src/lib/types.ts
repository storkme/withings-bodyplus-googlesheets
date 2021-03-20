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
  userid: string;
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

export interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: string;
}

export type MeasureTypeCode = 1 | 5 | 6 | 8 | 76 | 77 | 88;
export type MeasureType = 'weight' | 'fatfreeMass' | 'fatRatio' | 'fatMass' | 'muscleMass' | 'hydration' | 'boneMass';

export const WithingsTypes = new Map<MeasureTypeCode, MeasureType>()
  .set(1, 'weight')
  .set(5, 'fatfreeMass')
  .set(6, 'fatRatio')
  .set(8, 'fatMass')
  .set(76, 'muscleMass')
  .set(77, 'hydration')
  .set(88, 'boneMass')
  .set(1, 'weight');

export interface GetMeasResponse {
  updatetime: number;
  timezone: string;
  measuregrps: {
    grpid: number;
    attrib: number;
    date: number;
    created: number;
    category: number;
    deviceid: string;
    hash_deviceid: string;
    comment: string;
    measures: {
      value: number;
      type: MeasureTypeCode;
      unit: number;
    }[];
  }[];
}

export interface Measurement {
  updatetime: Date;
  measures: Record<MeasureType, number>;
}
