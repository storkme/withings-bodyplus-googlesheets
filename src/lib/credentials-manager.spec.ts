import CredentialsManager from "./credentials-manager";
import * as FS from "fs";
import resetAllMocks = jest.resetAllMocks;

const mockFileName = "/made/up/filename";

describe("CredentialsManager", () => {
  const readFileMock = jest.fn();
  const writeFileMock = jest.fn();
  const fsAsyncMock = ({
    promises: {
      readFile: readFileMock,
      writeFile: writeFileMock,
    },
  } as unknown) as typeof FS;

  beforeEach(() => resetAllMocks());

  describe("fromFile", () => {
    it("should throw an error from the init fn if the credentials are required", async () => {
      readFileMock.mockRejectedValue(new Error("file not found or whatever"));

      await expect(
        CredentialsManager.fromFile(mockFileName, true, fsAsyncMock)
      ).rejects.toThrow();
    });

    it("should not throw an error from the init fn if the credentials are not required", async () => {
      readFileMock.mockRejectedValue(new Error("file not found or whatever"));

      const cm = await CredentialsManager.fromFile(
        mockFileName,
        false,
        fsAsyncMock
      );
      expect(cm.value).toEqual(undefined);
    });

    it("should load the credentials file if it exists", async () => {
      readFileMock.mockResolvedValue('"cool creds"');

      const cm = await CredentialsManager.fromFile(
        mockFileName,
        true,
        fsAsyncMock
      );
      expect(cm.value).toEqual("cool creds");
    });
  });

  it('should save the credentials as json when set', async () =>{
    readFileMock.mockRejectedValue(new Error("file not found or whatever"));

    const cm = await CredentialsManager.fromFile(
      mockFileName,
      false,
      fsAsyncMock
    );

    expect(cm.value).toEqual(undefined);
    await cm.save({'not':'gd'});
    expect(cm.value).toEqual({ not: 'gd'});
    expect(writeFileMock).toHaveBeenCalledWith(mockFileName, '{"not":"gd"}', expect.anything());
  });
});
