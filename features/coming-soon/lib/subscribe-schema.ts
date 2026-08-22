import { z } from "zod";

// Loose on purpose: campus phones arrive as "(757) 221-1234", "757.221.1234",
// "+1757...". Normalization to E.164 happens if/when SMS ships (A2P, P5+).
const PHONE_PATTERN = /^\+?[0-9().\s-]{7,20}$/;

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().regex(PHONE_PATTERN).optional(),
  ),
});

export type SubscribeInput = z.output<typeof subscribeSchema>;
