import { google } from "googleapis";
import { GoogleApiCredentials, Measurement } from "./types";
import CredentialsManager from "./credentials-manager";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export default class GoogleSheets {
  private constructor(
    private userCredentials: CredentialsManager<{ tokens: string[] }>,
    private auth: any,
    private spreadSheetId: string
  ) {}

  async getToken(code: string) {
    const { tokens } = await this.auth.getToken(code);
    await this.userCredentials.save(tokens);
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
          values: measurements.map(({ updatetime, measures }) => [
            updatetime,
            ...Object.values(measures),
          ]),
        },
      })
    ).data;
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
