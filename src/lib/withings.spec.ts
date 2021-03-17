import { getSignature } from "./withings";
import * as crypto from "crypto";

describe("withings", () => {
  describe("client", () => {
    it('should return an object i guess', () => {
      expect(withingsClient).toBeTruthy();
    });
  });
});
