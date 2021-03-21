import * as FS from "fs";
import { BehaviorSubject, Observable } from "rxjs";

export default class CredentialsManager<T> {
  private contents = new BehaviorSubject<T | undefined>(undefined);
  private fs: typeof FS;

  constructor(private filePath: string, fs?: typeof FS) {
    this.fs = fs ?? FS;
  }

  private async loadFromFile() {
    this.contents.next(
      JSON.parse(await this.fs.promises.readFile(this.filePath, "utf-8"))
    );
  }

  public get value(): T | undefined {
    return this.contents.value;
  }

  public get $(): Observable<T | undefined> {
    return this.contents.asObservable();
  }

  public async save(contents: T) {
    await this.fs.promises.writeFile(
      this.filePath,
      JSON.stringify(contents),
      "utf-8"
    );
    this.contents.next(contents);
  }

  static async fromFile<T>(
    filePath: string,
    required = false,
    fs?: typeof FS
  ): Promise<CredentialsManager<T>> {
    const cm = new CredentialsManager<T>(filePath, fs);
    try {
      await cm.loadFromFile();
    } catch (error) {
      if (required) {
        throw new Error("failed to load credentials file: " + filePath);
      }
    }
    return cm;
  }
}
