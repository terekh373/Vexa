import { z } from 'zod';

// Not strict: express.urlencoded may hand back extra fields LiqPay does not
// document, and only `data`/`signature` matter here.
export const webhookBodySchema = z.object({
  data: z.string().min(1).max(20_000),
  signature: z.string().min(1).max(200),
});

export type WebhookBody = z.infer<typeof webhookBodySchema>;
