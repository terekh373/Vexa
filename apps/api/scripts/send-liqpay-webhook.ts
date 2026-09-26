/**
 * Manually fire a LiqPay-shaped webhook at a local (or tunneled) API, so the
 * payment flow can be exercised without waiting for a real sandbox card
 * transaction. Signs the payload the same way LiqPay does, using the
 * private key from the environment.
 *
 * Usage: npm run webhook:liqpay -- <paymentId> <status> <amountKopiykas> [url]
 */
import { z } from 'zod';
import { env } from '../src/config/env.js';
import { encodeData, signData } from '../src/modules/payments/liqpay.js';

const argsSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.string().min(1),
  amountKopiykas: z.coerce.number().int().nonnegative(),
  url: z.string().url().optional(),
});

function parseArgs(argv: string[]): z.infer<typeof argsSchema> {
  const [paymentId, status, amountKopiykas, url] = argv;
  const result = argsSchema.safeParse({ paymentId, status, amountKopiykas, url });

  if (!result.success) {
    console.error('Usage: webhook:liqpay <paymentId> <status> <amountKopiykas> [url]');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const data = encodeData({
    order_id: args.paymentId,
    status: args.status,
    amount: args.amountKopiykas / 100,
    currency: 'UAH',
  });
  const signature = signData(data, env.LIQPAY_PRIVATE_KEY);

  const targetUrl = args.url ?? env.PAYMENT_WEBHOOK_URL;
  const body = new URLSearchParams({ data, signature });

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  console.log(`${response.status} ${response.statusText}`);
  console.log(await response.text());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
