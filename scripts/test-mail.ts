import { parseArgs } from 'node:util';
import { MailError, sendTestMail } from './mail';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { to: { type: 'string' } },
    strict: true,
    allowPositionals: false,
  });

  await sendTestMail(process.env, values.to);
}

main()
  .then(() => {
    console.log('SMTP test accepted by Gmail. Check the recipient inbox and spam folder.');
  })
  .catch((error: unknown) => {
    // SMTP errors can expose credentials or addresses; keep terminal output private.
    if (error instanceof MailError) {
      console.error(`SMTP test failed: ${error.message}`);
    } else {
      console.error(
        'SMTP test failed. Use --to recipient@example.com for a custom recipient. Check the address, SANTA_SENDER_EMAIL and GOOGLE_APPLICATION_PASSWORD in .env, and network access to smtp.gmail.com:465. Check sent mail before retrying.',
      );
    }

    process.exitCode = 1;
  });
