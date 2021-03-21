import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as path from "path";
import * as withings from "./routes/api/withings";
import GoogleSheets from "./lib/google-sheets";
import CredentialsManager from "./lib/credentials-manager";
import WithingsClient from "./lib/withings";
import { GoogleApiCredentials, WithingsUserCredentials } from "./lib/types";
import * as google from './routes/api/google';
const app = express();
const logger = pino({
  level: "debug",
  useLevel: "trace", // hide http logs for now ....
});

if (
  !process.env.WITHINGS_CLIENT_ID ||
  !process.env.WITHINGS_CLIENT_SECRET ||
  !process.env.WITHINGS_CALLBACK_URL ||
  !process.env.GOOGLE_SHEET_ID
) {
  console.error(
    "Missing WITHINGS_CLIENT_ID / WITHINGS_CLIENT_SECRET / WITHINGS_CALLBACK_URL / process.env.GOOGLE_SHEET_ID"
  );
  process.exit(1);
}

(async () => {
  const googleCredentialsCm = await CredentialsManager.fromFile<GoogleApiCredentials>(
    path.join(__dirname, "../etc/credentials.json"),
    true
  );
  const withingsCm = await CredentialsManager.fromFile<WithingsUserCredentials>(
    path.join(__dirname, "../etc/withings-user.json")
  );
  const googleUserCm = await CredentialsManager.fromFile<any>(
    path.join(__dirname, "../etc/google-user.json")
  );

  const withingsClient = new WithingsClient(withingsCm);

  console.log("Withings auth URL: ", withingsClient.authUrl);

  const gs = await GoogleSheets.init(
    googleCredentialsCm,
    googleUserCm,
    process.env.GOOGLE_SHEET_ID!!
  );

  app.use(logger);
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/callbacks/withings", withings.get(withingsClient));
  app.head("/api/callbacks/withings", withings.head());
  app.post("/api/callbacks/withings", withings.post(withingsClient, gs));

  app.get('/api/callbacks/google', google.get(googleUserCm, gs))

  app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
})().catch((err) => {
  console.error("unhandled error", err);
});
