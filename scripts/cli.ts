import { parseArgs } from 'node:util';
import { withLock } from './storage';
import { createWorkspace, validateWorkspace } from './workspace';
import {
  checkCampaign,
  generateDemo,
  prepareCampaign,
  resolveDelivery,
  sendCampaignMail,
  type CommandOptions,
} from './operations';

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      id: { type: 'string' },
      participants: { type: 'string' },
      'base-url': { type: 'string' },
      send: { type: 'boolean', default: false },
      confirm: { type: 'string' },
      published: { type: 'boolean', default: false },
      record: { type: 'string' },
      status: { type: 'string' },
      'message-id': { type: 'string' },
    },
  });

  if (positionals.length !== 1) {
    throw new Error('Provide exactly one operation. See the README.');
  }

  const command = positionals[0];
  const workspace = createWorkspace(process.cwd(), command === 'demo' ? undefined : values.id);
  const options: CommandOptions = {
    id: values.id,
    participantFile: values.participants,
    baseUrl: values['base-url'],
    live: values.send,
    confirmation: values.confirm,
    published: values.published,
    recordId: values.record,
    status: values.status,
    messageId: values['message-id'],
  };

  await withLock(workspace.root, async () => {
    if (command === 'demo') {
      await generateDemo(workspace, options);

      return;
    }

    validateWorkspace(workspace);

    switch (command) {
      case 'prepare':
        await prepareCampaign(workspace, options);
        break;
      case 'check':
        await checkCampaign(workspace, options);
        break;
      case 'mail':
        await sendCampaignMail(workspace, options);
        break;
      case 'resolve':
        await resolveDelivery(workspace, options);
        break;
      default:
        throw new Error('Unknown operation. See the README.');
    }
  });
}

main().catch(() => {
  // Raw parser, Git and service errors may contain private data.
  console.error(
    'Operation stopped. Check arguments, configuration and archive/public data consistency. If delivery started, inspect sent mail and resolve uncertain records before resuming. See the README troubleshooting section.',
  );
  process.exitCode = 1;
});
