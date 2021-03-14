import "source-map-support/register";
import express from "express";
import pino from "pino-http";
import * as read from './routes/read';

const app = express();
const logger = pino({ level: "debug" });

app.use(logger);

app.post("/read", ...read.middleware, read.route());

app.listen(process.env.NODE_PORT ? parseInt(process.env.NODE_PORT) : 80);
