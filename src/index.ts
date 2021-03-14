import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as read from './routes/read';
import * as path from 'path';
import fetch from 'node-fetch';

const app = express();
const logger = pino({ level: "debug" });

if (!process.env.WITHINGS_CLIENT_ID || !process.env.WITHINGS_CLIENT_SECRET) {
  console.error('Missing WITHINGS_CLIENT_ID/WITHINGS_CLIENT_SECRET');
  process.exit(1);
}

app.use(logger);

app.get('/', express.static(path.join(__dirname, '../static')));
app.post("/read", ...read.middleware, read.route());
app.get("/oauth", async (req, res, next) => {
  try {
    // get access token as per https://developer.withings.com/oauth2/#operation/oauth2-authorize
    const result = await fetch(`https://wbsapi.withings.net/v2/oauth2`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'access_token',
        client_id: process.env.WITHINGS_CLIENT_ID!!,
        client_secret: process.env.WITHINGS_CLIENT_ID!!,
        code: req.query.code as string,
        redirect_uri: `https://withings-bodyplus-googlesheets.not.gd/?state=${req.query.start}`,
      })
    });

    res.status(200).json(await result.json());
  } catch (e) {
    next(e);
  }
});

app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
