import { RequestHandler } from "express";
import WithingsClient from "../../lib/withings";

export function get(): RequestHandler {
  const withings = new WithingsClient();

  return async (req, res, next) => {
    try {
      const authResult = await withings.getAccessToken(
        req.query.code as string
      );

      console.log(`\nWITHINGS_USER_ACCESS_TOKEN=${authResult.access_token}
WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT=${
        parseInt(authResult.expires_in) * 1000
      }
WITHINGS_USER_REFRESH_TOKEN=${authResult.refresh_token}\n`);

      const subscription = await withings.subscribe();

      req.log?.child({ authResult, subscription }).info("subscribed?");

      res.status(200).json(subscription);
    } catch (error) {
      req.log?.child({ error }).error("failed to get access token / subscribe");
      next(error);
    }
  };
}

export function post(): RequestHandler {
  const withings = new WithingsClient();

  return async (req, res, next) => {
    const { userid, startdate, enddate, appli } = req.body;
    if (!userid || !startdate || !enddate || !appli) {
      res.status(204).send(); // no body params passed to callback? nothing to do
      req.log?.debug("callback called with no body data");
    } else {
      res.status(204).send(); // reply asap so Withings doesn't time us out

      try {
        const measures = await withings.getMeasures(startdate, enddate);
        req.log?.child({ measures }).debug("got measures!!");
      } catch (error) {
        req.log?.child({ error }).error("failed to obtain measures");
        next(error);
      }
    }
  };
}
