import { redis } from "../lib/redis.js";

export class SendStatusToRedis {
  public upstashClient: any;
  constructor(upstashUrl: string, upstashToken: string) {
    this.upstashClient = redis(upstashUrl, upstashToken);
  }

  sendStatusToRedis = async (
    chatId: string,
    genId: string,
    event: {
      event_type: string;
      step?: string;
      message?: string;
      seq_num: number;
    },
  ) => {
    const streamKey = `chat:${chatId}:gen:${genId}:events`;

    await this.upstashClient.xadd(
      streamKey,
      "*",
      {
        event_type: event.event_type,
        step: event.step ?? "",
        message: event.message ?? "",
        seq_num: event.seq_num.toString(),
      },
      {
        trim: {
          type: "MAXLEN",
          threshold: 1000,
          comparison: "=",
        },
      },
    );

    await this.upstashClient.hset(`chat:${chatId}:state:${genId}`, {
      event_type: event.event_type,
      step: event.step ?? "",
      message: event.message ?? "",
      seq_num: event.seq_num.toString(),
      last_seq: event.seq_num.toString(),
    });
  };
}
