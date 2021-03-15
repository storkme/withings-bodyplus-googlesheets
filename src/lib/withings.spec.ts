import { getSignature } from "./withings";
import * as crypto from "crypto";

describe("withings", () => {
  describe("getSignature", () => {
    const testSecret = "abcd1234";
    const testId = "abcd1234";
    let secret: string | undefined;
    let id: string | undefined;

    beforeEach(() => {
      secret = process.env.WITHINGS_CLIENT_SECRET;
      id = process.env.WITHINGS_CLIENT_ID;
      process.env.WITHINGS_CLIENT_SECRET = testSecret;
      process.env.WITHINGS_CLIENT_ID = testId;
    });

    afterEach(() => {
      process.env.WITHINGS_CLIENT_SECRET = secret;
      process.env.WITHINGS_CLIENT_ID = id;
    });

    it("should sort the keys in the input into alphabetical order", () => {
      const result = getSignature({ action: "test", nonce: "abc123" });
      const expectedSignature = crypto
        .createHmac("sha256", testSecret)
        .update(`test,${testId},abc123`)
        .digest("hex");
      expect(result).toEqual(expectedSignature);
    });
  });
});
