import WithingsClient from "./withings";

describe("WithingsClient", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      WITHINGS_CLIENT_ID: "withingsClientId",
      WITHINGS_CLIENT_SECRET: "withingsClientSecret",
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("getToken", () => {
    it("should return the token from process.env if it hasn't expired", async () => {
      process.env = {
        ...process.env,
        WITHINGS_USER_ACCESS_TOKEN: "userAccessToken",
        WITHINGS_USER_REFRESH_TOKEN: "userRefreshToken",
        WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT: String(Date.now() + 90000),
      };

      const withings = new WithingsClient();

      expect(withings["getToken"]()).toEqual("userAccessToken");
    });

    it("should return undefined if there are no tokens", async () => {
      const withings = new WithingsClient();

      expect(withings["getToken"]()).toEqual(undefined);
    });

    it("should use the refresh token if there is one and the token has expired", async () => {
      process.env = {
        ...process.env,
        WITHINGS_USER_ACCESS_TOKEN: "userAccessToken",
        WITHINGS_USER_REFRESH_TOKEN: "userRefreshToken",
        WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT: String(Date.now() - 90000),
      };
      const withings = new WithingsClient();
      withings["apiCall"] = jest.fn().mockResolvedValue({
        body: {
          refresh_token: "newRefreshToken",
          access_token: "newAccessToken",
          expires_in: "1000",
        },
      });

      const result = await withings["getToken"]();

      expect(result).toEqual("newAccessToken");
      expect(withings["apiCall"]).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ refresh_token: "userRefreshToken" }),
      );
    });
  });
});
