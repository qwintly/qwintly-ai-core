// lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = (upstashUrl: string, upstashToken: string) =>
  new Redis({
    url: upstashUrl,
    token: upstashToken,
  });
