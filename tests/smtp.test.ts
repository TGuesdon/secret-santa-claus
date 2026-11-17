import { beforeEach, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { composeMail, gmailTransport, sendTestMail } from '../scripts/mail';
import { createCampaign } from '../scripts/campaign';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

const sendMail = vi.fn();
const env = {
  SANTA_SENDER_EMAIL: 'santa@example.com',
  GOOGLE_APPLICATION_PASSWORD: 'abcd efgh ijkl mnop',
};
const mime = Buffer.from('Message-ID: <record.campaign@secret-santa.invalid>\r\n\r\nPrivate body');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
  sendMail.mockResolvedValue({
    accepted: ['alice@example.com'],
    rejected: [],
    messageId: '<record.campaign@secret-santa.invalid>',
  });
});

it('uses authenticated Gmail TLS and sends the original MIME with an explicit envelope', async () => {
  const send = gmailTransport(env);

  await expect(send(mime, 'alice@example.com')).resolves.toBe(
    '<record.campaign@secret-santa.invalid>',
  );
  expect(nodemailer.createTransport).toHaveBeenCalledWith(
    expect.objectContaining({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: env.SANTA_SENDER_EMAIL, pass: 'abcdefghijklmnop' },
      logger: false,
      debug: false,
    }),
  );
  expect(sendMail).toHaveBeenCalledExactlyOnceWith({
    envelope: { from: env.SANTA_SENDER_EMAIL, to: ['alice@example.com'] },
    raw: mime,
    messageId: '<record.campaign@secret-santa.invalid>',
  });
});

it('rejects missing credentials and invalid addresses before SMTP', async () => {
  expect(() => gmailTransport({ SANTA_SENDER_EMAIL: env.SANTA_SENDER_EMAIL })).toThrow();
  expect(() => gmailTransport({ GOOGLE_APPLICATION_PASSWORD: '    ' })).toThrow();
  expect(() => gmailTransport({ ...env, SANTA_SENDER_EMAIL: 'invalid' })).toThrow();

  const send = gmailTransport(env);

  await expect(send(Buffer.from('private'), 'X\r\nBcc: leak@example.com')).rejects.toThrow();
  expect(sendMail).not.toHaveBeenCalled();
});

it('requires recipient acceptance and a message identifier before confirming success', async () => {
  const send = gmailTransport(env);

  for (const response of [
    { accepted: [], rejected: ['alice@example.com'], messageId: '<id>' },
    { accepted: ['other@example.com'], rejected: [], messageId: '<id>' },
    { accepted: ['alice@example.com'], rejected: [] },
  ]) {
    sendMail.mockResolvedValueOnce(response);

    await expect(send(mime, 'alice@example.com')).rejects.toThrow(/not confirmed/);
  }
});

it('sanitizes SMTP failures and never retries an uncertain send', async () => {
  sendMail.mockRejectedValueOnce(new Error('Credentials and private email body'));

  await expect(gmailTransport(env)(mime, 'alice@example.com')).rejects.toThrow(
    'Gmail delivery was not confirmed. Check sent mail before resuming.',
  );
  expect(sendMail).toHaveBeenCalledTimes(1);
});

it.each([
  ['EAUTH', 535, 'authentication'],
  ['ETIMEDOUT', undefined, 'timed out'],
  ['EDNS', undefined, 'DNS'],
  ['ECONNECTION', undefined, 'connection'],
])(
  'reports a safe diagnostic for %s without leaking raw SMTP details',
  async (code, responseCode, hint) => {
    sendMail.mockRejectedValueOnce({
      code,
      responseCode,
      message: 'private-password alice@example.com',
      response: 'private SMTP response',
    });

    const error = await gmailTransport(env)(mime, 'alice@example.com').catch(
      (error: Error) => error,
    );

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain(code);
    expect(String(error)).toContain(hint);
    expect(String(error)).not.toContain('private');
    expect(String(error)).not.toContain('alice@example.com');

    if (responseCode) {
      expect(String(error)).toContain(String(responseCode));
    }
  },
);

it('records the Message-ID actually present in the raw email', async () => {
  const real = await vi.importActual<typeof import('nodemailer')>('nodemailer');
  const transport = real.default.createTransport({ streamTransport: true, buffer: true });
  const { campaign } = await createCampaign(
    [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ],
    { id: 'test', executor: 'local', baseUrl: 'https://example.com/' },
  );
  const mime = await composeMail(
    campaign.records[0],
    { name: 'Santa', email: env.SANTA_SENDER_EMAIL },
    'test',
  );
  const parsed = await simpleParser(mime);

  sendMail.mockImplementationOnce(async (options) => {
    const result = await transport.sendMail(options);

    // Exercise Nodemailer's real raw-MIME metadata without opening a connection.
    return { ...result, accepted: ['alice@example.com'], rejected: [] };
  });

  await expect(gmailTransport(env)(mime, 'alice@example.com')).resolves.toBe(parsed.messageId);
});

it('sends the standalone SMTP test only to the configured sender', async () => {
  sendMail.mockResolvedValueOnce({
    accepted: [env.SANTA_SENDER_EMAIL],
    rejected: [],
    messageId: '<test@secret-santa.invalid>',
  });

  await sendTestMail(env);

  expect(sendMail).toHaveBeenCalledTimes(1);

  const message = sendMail.mock.calls[0][0];
  const parsed = await simpleParser(message.raw);

  expect(message.envelope).toEqual({
    from: env.SANTA_SENDER_EMAIL,
    to: [env.SANTA_SENDER_EMAIL],
  });
  expect(parsed.to).toMatchObject({ value: [{ address: env.SANTA_SENDER_EMAIL }] });
  expect(parsed.from?.value[0].address).toBe(env.SANTA_SENDER_EMAIL);
  expect(parsed.subject).toBe('Secret Santa: test SMTP');
  expect(parsed.text).toContain('Le test SMTP de Secret Santa a fonctionné');
  expect(parsed.text).toContain('Aucun tirage n’a été créé ou modifié');
  expect(parsed.attachments).toHaveLength(0);
  expect(parsed.messageId).toMatch(/^<smtp-test\.[a-f0-9-]+@secret-santa\.invalid>$/);
});

it('uses the requested test recipient while keeping the authenticated sender', async () => {
  await sendTestMail(env, 'alice@example.com');

  const message = sendMail.mock.calls[0][0];
  const parsed = await simpleParser(message.raw);

  expect(message.envelope).toEqual({ from: env.SANTA_SENDER_EMAIL, to: ['alice@example.com'] });
  expect(parsed.to).toMatchObject({ value: [{ address: 'alice@example.com' }] });
  expect(parsed.from?.value[0].address).toBe(env.SANTA_SENDER_EMAIL);
});

it('rejects an invalid test recipient before sending', async () => {
  for (const recipient of ['', 'invalid', 'alice@example.com\r\nBcc: other@example.com']) {
    await expect(sendTestMail(env, recipient)).rejects.toThrow(/email address/);
  }

  expect(sendMail).not.toHaveBeenCalled();
});
