import "source-map-support/register";
import express, { Request, Response, NextFunction } from "express";
import pino from "pino-http";
import * as path from "path";
import fetch from "node-fetch";
import { apiCall, client, getSignature } from "./lib/withings";

const app = express();
const logger = pino({
  level: "debug",
  useLevel: 'trace' // hide http logs for now ....
});

if (!process.env.WITHINGS_CLIENT_ID || !process.env.WITHINGS_CLIENT_SECRET) {
  console.error("Missing WITHINGS_CLIENT_ID/WITHINGS_CLIENT_SECRET");
  process.exit(1);
}

app.use(logger);
app.use(express.urlencoded({ extended: true }));

app.get("/", express.static(path.join(__dirname, "../static")));
app.post("/callback", async (req: Request, res: Response, next: NextFunction) => {
  console.log('/callback has been POSTed to', req.body, req);

  const { userid, startdate, enddate, appli } = req.body;
  if (!userid || !startdate || !enddate || !appli) {
    res.status(204).send(); // no body params passed to callback? nothing to do
    req.log?.debug('callback called with no body data');
  } else {
    res.status(204).send(); // reply asap so Withings doesn't time us out
    const withings = client();
    try {
      const measures = await withings.getMeasures(startdate, enddate);
      req.log?.child({ measures }).debug('got measures!!');
    } catch (error) {
      req.log?.child({ error }).debug('failed to obtain measures');
      next(error);
    }
  }
});
app.get("/callback", async (req: Request, res: Response, next: NextFunction) => {
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
      console.log(`\nWITHINGS_USER_ACCESS_TOKEN=${authResult.body.access_token}
WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT=${parseInt(authResult.body.expires_in) * 1000}
WITHINGS_USER_REFRESH_TOKEN=${authResult.body.refresh_token}\n`);

      const result = await apiCall(
        "https://wbsapi.withings.net/notify",
        {
          action: "subscribe",
          callbackurl: `https://withings-bodyplus-googlesheets.not.gd/callback`,
          appli: "1",
        },
        authResult.body.access_token,
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
