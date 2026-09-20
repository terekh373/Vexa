import { env } from '../config/env.js';
import { logger } from './logger.js';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

type Mailbox = {
  email: string;
  name?: string;
};

export interface MailMessage {
  to: Mailbox[];
  subject: string;
  html: string;
  text: string;
  replyTo?: Mailbox;
}

export type MailTransport = (message: MailMessage) => Promise<void>;

let testTransport: MailTransport | null = null;

/**
 * Integration tests replace the transport instead of talking to Brevo.
 * Production code must never be able to swap the transport dynamically.
 */
export function setMailTransportForTests(transport: MailTransport | null): void {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Mail transport can only be replaced in tests');
  }

  testTransport = transport;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function webUrl(path: string): string {
  return `${env.WEB_APP_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

async function brevoTransport(message: MailMessage): Promise<void> {
  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: env.MAIL_FROM_EMAIL,
        name: env.MAIL_FROM_NAME,
      },
      to: message.to,
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(
      `Brevo rejected email with ${response.status}${responseText ? `: ${responseText.slice(0, 500)}` : ''}`,
    );
  }
}

/**
 * Best-effort email delivery. A provider outage must not roll back the business
 * operation that caused the notification (purchase, moderation, payout, etc.).
 */
export async function sendMail(message: MailMessage): Promise<void> {
  try {
    if (testTransport !== null) {
      await testTransport(message);
      return;
    }

    // Tests must never send real mail, even if the machine running them happens
    // to have a BREVO_API_KEY in its environment.
    if (env.NODE_ENV === 'test' || !env.BREVO_API_KEY) {
      logger.info(
        {
          to: message.to.map((recipient) => recipient.email),
          subject: message.subject,
          text: message.text,
        },
        'Email delivery stubbed (BREVO_API_KEY is not configured)',
      );
      return;
    }

    await brevoTransport(message);
  } catch (error) {
    logger.error(
      {
        err: error,
        to: message.to.map((recipient) => recipient.email),
        subject: message.subject,
      },
      'Email delivery failed',
    );
  }
}

export async function sendPurchaseReceiptEmail(input: {
  email: string;
  orderId: string;
  totalAmount: string;
}): Promise<void> {
  const ordersUrl = webUrl('/orders');
  const orderId = escapeHtml(input.orderId);
  const total = escapeHtml(input.totalAmount);

  await sendMail({
    to: [{ email: input.email }],
    subject: 'Vexa — підтвердження покупки',
    text: `Дякуємо за покупку у Vexa. Замовлення: ${input.orderId}. Сума: ${input.totalAmount}. Ваші замовлення: ${ordersUrl}`,
    html: `<p>Дякуємо за покупку у Vexa.</p><p>Замовлення: <strong>${orderId}</strong><br>Сума: <strong>${total}</strong></p><p><a href="${ordersUrl}">Переглянути замовлення</a></p>`,
  });
}

export async function sendModerationResultEmail(input: {
  email: string;
  courseTitle: string;
  approved: boolean;
  comment?: string | null;
}): Promise<void> {
  const coursesUrl = webUrl('/author/courses');
  const resultText = input.approved ? 'схвалено' : 'відхилено';
  const commentText = input.comment?.trim() ?? '';
  const commentHtml = commentText
    ? `<p>Коментар модератора: ${escapeHtml(commentText)}</p>`
    : '';

  await sendMail({
    to: [{ email: input.email }],
    subject: `Vexa — курс ${resultText}`,
    text: `Курс «${input.courseTitle}» ${resultText}.${commentText ? ` Коментар модератора: ${commentText}.` : ''} Ваші курси: ${coursesUrl}`,
    html: `<p>Курс «<strong>${escapeHtml(input.courseTitle)}</strong>» ${resultText}.</p>${commentHtml}<p><a href="${coursesUrl}">Перейти до курсів</a></p>`,
  });
}

export async function sendPayoutRequestEmail(input: {
  email: string;
  payoutId: string;
  amount: string;
}): Promise<void> {
  const balanceUrl = webUrl('/author/balance');

  await sendMail({
    to: [{ email: input.email }],
    subject: 'Vexa — заявку на виплату отримано',
    text: `Ми отримали заявку на виплату ${input.amount}. Номер заявки: ${input.payoutId}. Баланс: ${balanceUrl}`,
    html: `<p>Ми отримали заявку на виплату <strong>${escapeHtml(input.amount)}</strong>.</p><p>Номер заявки: ${escapeHtml(input.payoutId)}</p><p><a href="${balanceUrl}">Перейти до балансу</a></p>`,
  });
}

export async function sendSupportContactEmail(input: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  await sendMail({
    to: [{ email: env.SUPPORT_EMAIL, name: 'Vexa Support' }],
    replyTo: { email: input.email, name: input.name },
    subject: `Vexa — звернення від ${input.name}`,
    text: `Ім'я: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
    html: `<p><strong>Ім'я:</strong> ${escapeHtml(input.name)}<br><strong>Email:</strong> ${escapeHtml(input.email)}</p><p>${escapeHtml(input.message).replaceAll('\n', '<br>')}</p>`,
  });
}
