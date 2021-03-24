import GoogleSheets from "./google-sheets";

describe("GoogleSheets", () => {
  describe("formatValues", () => {
    it("should format values in the ~correct~ order, inserting 'undefined' if values are missing", () => {
      expect(
        GoogleSheets["formatValues"]([
          {
            updatetime: new Date(0),
            measures: {
              boneMass: 1,
              fatfreeMass: 2,
              fatMass: 5,
              muscleMass: 1123,
              weight: 9001,
            },
          },
        ] as any)
      ).toEqual([[new Date(0), 9001, 2, undefined, 5, 1123, undefined, 1]]);
    });
  });
});
