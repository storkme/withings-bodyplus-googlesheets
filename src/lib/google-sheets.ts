import { google } from "googleapis";
import { GoogleApiCredentials, Measurement, WithingsTypes } from "./types";
import CredentialsManager from "./credentials-manager";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const sortedFields = Array.from(WithingsTypes.entries())
  .sort(([typeIdA], [typeIdB]) => typeIdA - typeIdB)
  .map(([, measureKey]) => measureKey);

export default class GoogleSheets {
  private constructor(
    private userCredentials: CredentialsManager<{ tokens: string[] }>,
    private auth: any,
    private spreadSheetId: string
  ) {}

  async getToken(code: string) {
    const token = await this.auth.getToken(code);
    await this.auth.setCredentials(token);
    await this.userCredentials.save(token.tokens);
    return token;
  }

  async saveValues(measurements: Measurement[]) {
    const sheets = google.sheets({ version: "v4", auth: this.auth });
    return (
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadSheetId,
        range: "Sheet1!A:H",
        valueInputOption: "RAW",
        requestBody: {
          majorDimension: "ROWS",
          values: GoogleSheets.formatValues(measurements),
        },
      })
    ).data;
  }

  /**
   * Format measurement results into rows consisting of a date followed by the measurements sorted according
   * to their withings ID type (see WithingsTypes for details). If the required measure doesn't have a value,
   * undefined is used.
   * @param measurements
   * @private
   */
  private static formatValues(
    measurements: Measurement[]
  ): [Date, ...(number | undefined)[]][] {
    return measurements.map(({ updatetime, measures }) => [
      updatetime,
      ...sortedFields.map((field) => measures[field]),
    ]);
  }

  public static async init(
    googleCm: CredentialsManager<GoogleApiCredentials>,
    googleUserCm: CredentialsManager<any>,
    spreadsheetId: string
  ): Promise<GoogleSheets> {
    const {
      client_secret,
      client_id,
      redirect_uris: [redirect_uri],
    } = googleCm.value!!.web;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    const gs = new GoogleSheets(googleUserCm, auth, spreadsheetId);

    if (googleUserCm.value) {
      auth.setCredentials(googleUserCm.value);
    } else {
      console.log(
        "google auth url: ",
        auth.generateAuthUrl({
          access_type: "offline",
          scope: SCOPES,
        })
      );
    }
    return gs;
  }
}
