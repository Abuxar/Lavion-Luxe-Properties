import pino from "pino";

// Logs go to stdout and then to disk on the KVM4 host — never to Mongo,
// where they would eat into the Flex storage ceiling.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
