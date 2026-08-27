import mongoose from "mongoose";
import { logger } from "./logger.js";

/**
 * The API holds ONE long-lived pool. This is the whole reason Vercel talks to
 * this service rather than to Atlas directly: Atlas Flex bursts to roughly
 * 500 ops/sec, and a single stable pool here is far easier to reason about and
 * to throttle than N function instances each opening their own.
 *
 * Keep maxPoolSize conservative — more sockets does not buy more throughput
 * against a Flex cluster, it just queues work closer to the ceiling.
 */
const MAX_POOL = Number(process.env.MONGO_MAX_POOL ?? 10);

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  mongoose.set("strictQuery", true);
  // Fail fast instead of buffering commands into a queue we cannot observe.
  mongoose.set("bufferCommands", false);

  connecting = mongoose.connect(uri, {
    maxPoolSize: MAX_POOL,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    compressors: ["zstd", "zlib"],
    retryWrites: true,
  });

  try {
    const m = await connecting;
    logger.info({ maxPoolSize: MAX_POOL }, "mongo connected");
    return m;
  } finally {
    connecting = null;
  }
}

/**
 * Ops/sec against a Flex cluster is the number that decides when you migrate
 * to M10. Sampling it here means the trigger is a dashboard line, not a
 * surprise during a traffic spike.
 */
let opCount = 0;
export function countOp() {
  opCount++;
}
export function readAndResetOps(): number {
  const n = opCount;
  opCount = 0;
  return n;
}

export async function disconnectDb() {
  await mongoose.connection.close();
}
