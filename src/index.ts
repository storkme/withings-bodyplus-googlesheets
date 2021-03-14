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
app.post("/oauth", async (req, res, next) => {

  const body = req.body;

  console.log('req', req);
  console.log('body', body);

  req.query.code;
  req.query.state;

  try {
    // get access token as per https://developer.withings.com/oauth2/#operation/oauth2-authorize
    await fetch({
      method: 'POST',
      url: `https://wbsapi.withings.net/v2/oauth2`,
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'access_token',
        client_id: process.env.WITHINGS_CLIENT_ID!!,
        client_secret: process.env.WITHINGS_CLIENT_ID!!,
        code: req.query.code as string,
        redirect_uri: `https://withings-bodyplus-googlesheets.not.gd/?state=${req.query.start}`,
      })
    } as any);

    res.status(200).send('ok');
  } catch(e) {
    next(e);
  }
});

app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
