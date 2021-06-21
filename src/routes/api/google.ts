import CredentialsManager from "../../lib/credentials-manager";
import { RequestHandler } from "express";
import GoogleSheets from "../../lib/google-sheets";

export function get(
  cm: CredentialsManager<any>,
  gs: GoogleSheets
): RequestHandler {
  return async (req, res, next) => {
    const { code } = req.query;

    if (!code) {
      res.status(400).send({ error: "invalid_request" });
      return;
    }

    try {
      const result = await gs.getToken(code as string);
      cm.save(result);
      res.status(200).send({status:'👌', result});
    } catch (error) {
      next(error);
    }
  };
}
