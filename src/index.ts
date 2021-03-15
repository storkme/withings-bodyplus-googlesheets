import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as read from "./routes/read";
import * as path from "path";
import fetch from "node-fetch";
import { apiCall, getSignature } from "./lib/withings";

const app = express();
const logger = pino({ level: "debug" });

if (!process.env.WITHINGS_CLIENT_ID || !process.env.WITHINGS_CLIENT_SECRET) {
  console.error("Missing WITHINGS_CLIENT_ID/WITHINGS_CLIENT_SECRET");
  process.exit(1);
}

app.use(logger);
app.use(express.urlencoded({ extended: true }));

app.get("/", express.static(path.join(__dirname, "../static")));
app.post("/callback", ...read.middleware, read.route());
app.get("/callback", async (req, res, next) => {
  try {
    // get access token as per https://developer.withings.com/oauth2/#operation/oauth2-authorize
    const authResult = await (
      await fetch(`https://wbsapi.withings.net/v2/oauth2`, {
        method: "POST",
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "requesttoken",
          grant_type: "access_token",
          client_id: process.env.WITHINGS_CLIENT_ID!!,
          client_secret: process.env.WITHINGS_CLIENT_SECRET!!,
          code: req.query.code as string,
          redirect_uri: `https://withings-bodyplus-googlesheets.not.gd/callback`,
        }),
      })
    ).json();

    if (authResult.status === 0 && authResult.body?.access_token) {
      const result = await apiCall(
        "https://wbsapi.withings.net/notify",
        authResult.body.access_token,
        {
          action: "subscribe",
          callbackurl: `https://withings-bodyplus-googlesheets.not.gd/callback`,
          appli: "1",
        }
      );

      req.log?.child({ authResult, result }).info("subscribed?");

      res.status(200).json(result);
    } else {
      res
        .status(500)
        .json({
          error: "something went wrong authenticating with withings",
          authResult,
        });
    }
  } catch (e) {
    next(e);
  }
});

app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
