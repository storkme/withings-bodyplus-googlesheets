import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as path from "path";
import * as withings from "./routes/api/withings";
import GoogleSheets from "./lib/google-sheets";

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

console.log(
  `http://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${process.env.WITHINGS_CLIENT_ID}&scope=user.info,user.metrics,user.activity&redirect_uri=${process.env.WITHINGS_CALLBACK_URL}`
);

(async () => {
  const gs = await GoogleSheets.init(
    path.join(__dirname, "../etc/credentials.json"),
    path.join(__dirname, "../etc/gtokens.json"),
    process.env.GOOGLE_SHEET_ID!!
  );

  app.use(logger);
  app.use(express.urlencoded({ extended: true }));

  app.head("/api/callbacks/withings", withings.head());
  app.post("/api/callbacks/withings", withings.post(gs));
  app.get("/api/callbacks/withings", withings.get());

  app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
})().catch((err) => {
  console.error("unhandled error", err);
});
