import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as path from "path";
import * as withings from "./routes/api/withings";

const app = express();
const logger = pino({
  level: "debug",
  useLevel: 'trace' // hide http logs for now ....
});

if (!process.env.WITHINGS_CLIENT_ID || !process.env.WITHINGS_CLIENT_SECRET || !process.env.WITHINGS_CALLBACK_URL) {
  console.error("Missing WITHINGS_CLIENT_ID/WITHINGS_CLIENT_SECRET/WITHINGS_CALLBACK_URL");
  process.exit(1);
}

app.use(logger);
app.use(express.urlencoded({ extended: true }));

app.get("/", express.static(path.join(__dirname, "../static")));
app.post("/api/callbacks/withings", withings.post());
app.get("/api/callbacks/withings", withings.get());

app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
