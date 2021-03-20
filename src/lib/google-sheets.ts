//
import * as FS from "fs";
import { google } from "googleapis";
import * as readline from "readline";
import { Measurement } from "./types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export default class GoogleSheets {
  private constructor(
    private auth: any,
    private spreadSheetId: string,
  ) {}

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
    credentialsFile: string,
    tokenFile: string,
    spreadsheetId:string,
  ): Promise<GoogleSheets> {
    const {
      client_secret,
      client_id,
      redirect_uris: [redirect_uri],
    } = JSON.parse(await FS.promises.readFile(credentialsFile, "utf-8")).web;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    const gs = new GoogleSheets(auth, spreadsheetId);

    try {
      const tokenData = JSON.parse(
        await FS.promises.readFile(tokenFile, "utf-8")
      );
      auth.setCredentials(tokenData);
      console.log("read credentials from file", tokenData);
    } catch (e) {
      const url = auth.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });

      rl.question(`go here and enter the code: ${url}: `, async (code) => {
        const { tokens } = await auth.getToken((code as unknown) as string);
        auth.setCredentials(tokens);
        await FS.promises.writeFile(tokenFile, JSON.stringify(tokens), {
          encoding: "utf-8",
        });
        console.log("saved credentials", tokens);
      });
    }

    return gs;
  }
}
