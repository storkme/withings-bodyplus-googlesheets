import WithingsClient from "./withings";
import { WithingsTypes } from "./types";

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

      expect(await withings["getToken"]()).toEqual("userAccessToken");
    });

    it("should return undefined if there are no tokens", async () => {
      const withings = new WithingsClient();

      expect(await withings["getToken"]()).toEqual(undefined);
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
          refresh_token: "newRefreshToken",
          access_token: "newAccessToken",
          expires_in: "1000",
      });

      const result = await withings["getToken"]();

      expect(result).toEqual("newAccessToken");
      expect(withings["apiCall"]).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ refresh_token: "userRefreshToken" }),
        false
      );
    });
  });

  describe("getMeasures", () => {

    it('should format the response correctly', async () => {

// my actual data. plz dont make fun of me
      const measureResponse = {
        updatetime: 1616141180,
        timezone: "Europe/London",
        measuregrps: [
          {
            grpid: 1337,
            attrib: 0,
            date: 1616141145,
            created: 1616141168,
            category: 1,
            deviceid: "~ redacted ~",
            hash_deviceid: "~ redacted ~",
            measures: [
              {
                value: 84959,
                type: 1,
                unit: -3,
                algo: 3,
                fm: 3,
              },
              {
                value: 1393,
                type: 8,
                unit: -2,
                algo: 3,
                fm: 3,
              },
              {
                value: 6748,
                type: 76,
                unit: -2,
                algo: 3,
                fm: 3,
              },
              {
                value: 4852,
                type: 77,
                unit: -2,
                algo: 3,
                fm: 3,
              },
              {
                value: 353,
                type: 88,
                unit: -2,
                algo: 3,
                fm: 3,
              },
              {
                value: 16396,
                type: 6,
                unit: -3,
              },
              {
                value: 71029,
                type: 5,
                unit: -3,
              },
            ],
            comment: null,
          },
        ],
      };

      process.env = {
        ...process.env,
        WITHINGS_USER_ACCESS_TOKEN: "userAccessToken",
        WITHINGS_USER_REFRESH_TOKEN: "userRefreshToken",
        WITHINGS_USER_ACCESS_TOKEN_EXPIRES_AT: String(Date.now() + 90000),
      };

      const withings = new WithingsClient();

      withings["getAccessToken"] = jest.fn().mockResolvedValue("token");
      withings["apiCall"] = jest.fn().mockResolvedValue(measureResponse);

      expect(await withings.getMeasures("123", "456")).toEqual([
        {
          updatetime: new Date(1616141145000),
          measures: {
            weight: 84.959,
            fatfreeMass: 71.029,
            fatRatio: 16.396,
            fatMass: 13.93,
            muscleMass: 67.48,
            hydration: 48.52,
            boneMass: 3.5300000000000002, //well.
          },
        },
      ]);
    });
  });
});
