import { RequestHandler } from 'express';

export function route(): RequestHandler {
  return async (req, res, next) => {

    // just testing, for now
    req.log?.child({body: req.body}).debug('request');
  };
}

export const middleware = [];
