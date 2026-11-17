import { randomUUID } from 'node:crypto';
import MailComposer from 'nodemailer/lib/mail-composer';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import type { DeliveryRecord } from './campaign';
import { validateEmail, validateName } from './participants';

export type Sender = { name: string; email: string };

// Only errors constructed here are safe to display in the test command.
export class MailError extends Error {}

function smtpError(error: unknown): MailError {
  const fallback = 'Gmail delivery was not confirmed. Check sent mail before resuming.';

  if (typeof error !== 'object' || error === null) {
    return new MailError(fallback);
  }

  const hints: Record<string, string> = {
    EAUTH: 'Gmail authentication failed. Check the sender account and its app password',
    ETIMEDOUT: 'The SMTP connection timed out. Check network access to smtp.gmail.com:465',
    EDNS: 'DNS lookup failed for the SMTP server',
    ECONNECTION: 'The SMTP connection failed. Check network access to smtp.gmail.com:465',
    ESOCKET: 'The SMTP socket or TLS connection failed',
    ETLS: 'SMTP TLS negotiation failed. Check certificates and network interception',
    EENVELOPE: 'The SMTP sender or recipient was rejected. Check the email addresses',
    EMESSAGE: 'The SMTP server rejected the message',
    EPROTOCOL: 'The SMTP server returned an unexpected protocol response',
  };
  const code = 'code' in error ? error.code : undefined;

  if (typeof code !== 'string' || !Object.hasOwn(hints, code)) {
    return new MailError(fallback);
  }

  const responseCode = 'responseCode' in error ? error.responseCode : undefined;
  const diagnostics = [code];

  if (
    Number.isInteger(responseCode) &&
    Number(responseCode) >= 400 &&
    Number(responseCode) <= 599
  ) {
    diagnostics.push(`SMTP ${responseCode}`);
  }

  return new MailError(`${hints[code]} (${diagnostics.join(', ')}). ${fallback}`);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export function validateSender(sender: Sender): void {
  validateName(sender.name);
  validateEmail(sender.email);
}

export async function composeMail(
  record: DeliveryRecord,
  sender: Sender,
  campaignId: string,
): Promise<Buffer> {
  validateSender(sender);
  validateName(record.name);
  validateEmail(record.email);

  if (!/^[a-z0-9-]+$/.test(campaignId)) {
    throw new Error('Invalid email headers.');
  }

  const png = await QRCode.toBuffer(record.url, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
  const greeting = `Ho ho ho ${record.name} !`;
  const instruction =
    'Ton tirage Secret Santa est prêt ! Ouvre ton lien personnel pour découvrir à qui tu vas offrir un cadeau.';
  const privacyNote =
    'Garde ce lien secret : toute personne qui le possède peut découvrir ton tirage.';
  const html = `
    <div lang="fr">
    <p>${escapeHtml(greeting)}</p>
    <p>${instruction}</p>
    <p><a href="${escapeHtml(record.url)}">Révéler mon tirage</a></p>
    <p>Tu peux aussi scanner ce QR code :</p>
    <img src="cid:santa-qr" alt="Ton lien personnel sous forme de QR code" width="240" height="240">
    <p>${privacyNote}</p>
    </div>
  `;

  return new MailComposer({
    from: { name: sender.name, address: sender.email },
    to: { name: record.name, address: record.email },
    subject: `Secret Santa: ${campaignId}`,
    headers: { 'Content-Language': 'fr' },
    messageId: `<${record.id}.${campaignId}@secret-santa.invalid>`,
    text: `${greeting}\n\n${instruction}\n\n${record.url}\n\n${privacyNote}`,
    html,
    attachments: [
      {
        filename: 'secret-santa.png',
        content: png,
        contentType: 'image/png',
        cid: 'santa-qr',
        contentDisposition: 'inline',
      },
    ],
  })
    .compile()
    .build();
}

function readMessageId(mime: Buffer): string {
  const headerEnd = mime.indexOf('\r\n\r\n');
  const headers = mime
    .subarray(0, headerEnd)
    .toString('utf8')
    .replace(/\r\n[ \t]+/g, ' ');
  const messageId = /^Message-ID:[ \t]*(<[^<>\s]+>)[ \t]*$/im.exec(headers)?.[1];

  if (headerEnd < 0 || !messageId) {
    throw new Error('The email must contain a valid Message-ID.');
  }

  return messageId;
}

export function gmailTransport(
  env: NodeJS.ProcessEnv = process.env,
): (mime: Buffer, recipient: string) => Promise<string> {
  const email = env.SANTA_SENDER_EMAIL;
  const password = env.GOOGLE_APPLICATION_PASSWORD?.replace(/\s/g, '');

  if (!email || !password) {
    throw new MailError(
      'Set SANTA_SENDER_EMAIL and GOOGLE_APPLICATION_PASSWORD in .env for Gmail SMTP.',
    );
  }

  validateEmail(email);

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email, pass: password },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
    logger: false,
    debug: false,
  });

  return async (mime, recipient) => {
    validateEmail(recipient);

    const messageId = readMessageId(mime);

    try {
      // Raw MIME needs an explicit SMTP envelope. Never retry an uncertain send.
      const result = await transport.sendMail({
        envelope: { from: email, to: [recipient] },
        raw: mime,
        // Nodemailer otherwise generates metadata unrelated to the raw Message-ID.
        messageId,
      });
      const accepted = result.accepted.some((address) => address === recipient);

      if (!accepted || result.rejected.length > 0 || !result.messageId) {
        throw new Error();
      }

      return result.messageId;
    } catch (error) {
      // Raw SMTP errors may contain credentials, addresses or the email body.
      throw smtpError(error);
    }
  };
}

export async function sendTestMail(
  env: NodeJS.ProcessEnv = process.env,
  recipient: string = env.SANTA_SENDER_EMAIL ?? '',
): Promise<void> {
  const send = gmailTransport(env);
  const sender = {
    name: env.SANTA_SENDER_NAME?.trim() || 'Santa Claus 🎅',
    email: env.SANTA_SENDER_EMAIL!,
  };

  validateSender(sender);
  validateEmail(recipient);

  // Keep this check independent of campaign data.
  const mime = await new MailComposer({
    from: { name: sender.name, address: sender.email },
    to: { address: recipient },
    subject: 'Secret Santa: test SMTP',
    headers: { 'Content-Language': 'fr' },
    messageId: `<smtp-test.${randomUUID()}@secret-santa.invalid>`,
    text: 'Le test SMTP de Secret Santa a fonctionné !\n\nAucun tirage n’a été créé ou modifié.',
  })
    .compile()
    .build();

  await send(mime, recipient);
}
