import { RequestHandler } from "express";
import WithingsClient from "../../lib/withings";
import GoogleSheets from "../../lib/google-sheets";

export function head(): RequestHandler {
  return (req, res) => {
    console.log("handling nice head request");
    res.status(204).send();
  };
}

export function get(withings: WithingsClient): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.query.code) {
        req.log?.info('withings callback called with no request code');
        return res.status(400).send({error:'invalid_request'});
      }

      const authResult = await withings.getAccessToken(
        req.query.code as string
      );

      const subscription = await withings.subscribe();

      req.log?.child({ authResult, subscription }).info("subscribed?");

      res.status(200).json(subscription);
    } catch (error) {
      req.log?.child({ error }).error("failed to get access token / subscribe");
      next(error);
    }
  };
}

export function post(
  withings: WithingsClient,
  gs: GoogleSheets
): RequestHandler {
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
        await gs.saveValues(measures);
        req.log?.child({ measures }).debug("appended");
      } catch (error) {
        req.log?.child({ error }).error("failed to obtain measures");
        next(error);
      }
    }
  };
}
