import { sendSupportContactEmail } from '../../lib/mailer.js';
import type { SupportContactInput } from './support.validation.js';

export async function submitSupportContact(input: SupportContactInput): Promise<void> {
  // sendMail is best-effort and logs provider failures, so a temporary mail
  // outage does not encourage the browser to hammer this rate-limited route.
  await sendSupportContactEmail(input);
}
