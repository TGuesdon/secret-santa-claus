import { expect, it } from 'vitest';
import { createCampaign, validateParticipants } from '../scripts/campaign';
import { openArchive, sealArchive, validateCampaign } from '../scripts/archive';
import { randomToken } from '../src/lib/crypto';

const options = { id: 'exclusions', baseUrl: 'https://example.com/', executor: 'local' as const };
const participants = [
  { name: 'Alice', email: 'alice@example.com', exclusions: ['Michel'] },
  { name: 'Bob', email: 'bob@example.com', exclusions: ['Stan'] },
  { name: 'Stan', email: 'stan@example.com', exclusions: ['Bob'] },
  { name: 'Michel', email: 'michel@example.com', exclusions: ['Alice'] },
];

it('respects directed exclusions and assigns each recipient exactly once', async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { campaign } = await createCampaign(participants, options);

    expect(new Set(campaign.records.map((record) => record.recipientName)).size).toBe(4);
    for (const record of campaign.records) {
      expect(record.recipientName).not.toBe(record.name);
      expect(
        participants.find((participant) => participant.name === record.name)?.exclusions,
      ).not.toContain(record.recipientName);
    }
  }
});

it('allows exclusions in one direction without imposing the reverse', async () => {
  const people = [
    { name: 'Alice', email: 'alice@example.com', exclusions: ['Stan'] },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Stan', email: 'stan@example.com', exclusions: ['Bob'] },
  ];
  const { campaign } = await createCampaign(people, options);

  expect(campaign.records.map((record) => record.recipientName)).toEqual(['Bob', 'Stan', 'Alice']);
});

it('normalizes exclusion names like participant names', () => {
  const people = validateParticipants([
    { name: 'Alice', email: 'alice@example.com', exclusions: ['  BOB '] },
    { name: 'Bob', email: 'bob@example.com' },
  ]);

  expect(people[0]).toHaveProperty('exclusions', ['Bob']);
});

it.each([null, 'Bob', [42], ['Nobody'], ['Bob', ' bob '], ['Alice']])(
  'rejects malformed, unknown, duplicate or self exclusions: %j',
  (exclusions) => {
    expect(() =>
      validateParticipants([
        { name: 'Alice', email: 'alice@example.com', exclusions },
        { name: 'Bob', email: 'bob@example.com' },
      ]),
    ).toThrow(/exclusion/i);
  },
);

it('rejects impossible constraints even when every giver has an eligible recipient', async () => {
  await expect(
    createCampaign(
      [
        { name: 'Alice', email: 'alice@example.com', exclusions: ['Stan'] },
        { name: 'Bob', email: 'bob@example.com', exclusions: ['Stan'] },
        { name: 'Stan', email: 'stan@example.com' },
      ],
      options,
    ),
  ).rejects.toThrow(/No valid assignment/);
});

it('preserves exclusions through encrypted archive recovery', async () => {
  const { campaign } = await createCampaign(participants, options);
  const key = randomToken(32);
  const recovered = await openArchive(await sealArchive(campaign, key), key);

  expect(recovered.records.map((record) => record.exclusions)).toEqual(
    participants.map((participant) => participant.exclusions),
  );
});

it('rejects archived assignments that violate their exclusions', async () => {
  const { campaign } = await createCampaign(participants, options);

  campaign.records[0].exclusions = [campaign.records[0].recipientName];

  expect(() => validateCampaign(campaign)).toThrow(/assignment/i);
});

it('accepts exactly the feasible exclusion graphs for four participants', async () => {
  const { drawRecipients } = await import('../scripts/assignments');
  const people = participants.map(({ name, email }) => ({ name, email }));
  const permutations = people.flatMap((first) =>
    people
      .filter((second) => second !== first)
      .flatMap((second) =>
        people
          .filter((third) => third !== first && third !== second)
          .map((third) => {
            const fourth = people.find((person) => ![first, second, third].includes(person))!;

            return [first, second, third, fourth];
          }),
      ),
  );
  const edges = people.flatMap((giver, giverIndex) =>
    people
      .filter((recipient) => recipient !== giver)
      .map((recipient) => ({ giverIndex, recipient })),
  );

  for (let mask = 0; mask < 2 ** edges.length; mask++) {
    const constrained = people.map((person, giverIndex) => ({
      ...person,
      exclusions: edges
        .filter((edge, index) => edge.giverIndex === giverIndex && mask & (1 << index))
        .map((edge) => edge.recipient.name),
    }));
    const allowed = (recipients: { name: string }[]) =>
      recipients.every(
        (recipient, index) =>
          recipient.name !== constrained[index].name &&
          !constrained[index].exclusions.includes(recipient.name),
      );
    const feasible = permutations.some(allowed);

    if (feasible) {
      expect(allowed(drawRecipients(constrained))).toBe(true);
    } else {
      expect(() => drawRecipients(constrained)).toThrow(/No valid assignment/);
    }
  }
});
