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
      return res.status(400).send({ error: "invalid_request" });
    }

    try {
      await gs.getToken(code as string);
    } catch (error) {
      next(error);
    }
  };
}
