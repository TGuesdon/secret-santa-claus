import { expect, it } from 'vitest';
import { validateParticipants } from '../scripts/participants';
import {
  parseConfiguration,
  serializeConfiguration,
  importEditor,
  exportEditor,
  removeParticipant,
} from '../src/lib/configuration';

const people = [
  { name: 'Alice', email: 'alice@example.com', exclusions: ['Michel'] },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Stan', email: 'stan@example.com' },
  { name: 'Michel', email: 'michel@example.com' },
];

it('shares normalized participant validation and typed email failures with the CLI', () => {
  expect(validateParticipants(people)[0].exclusions).toEqual(['Michel']);
  expect(() => validateParticipants([{ ...people[0], email: 'bad' }, people[1]])).toThrow(
    expect.objectContaining({ code: 'invalid-email', participantIndex: 0 }),
  );
});

it('imports and serializes the Actions dictionary and local participant array', () => {
  expect(parseConfiguration(JSON.stringify({ family: people }))).toEqual({ family: people });
  expect(parseConfiguration(JSON.stringify(people))).toEqual({ campaign: people });
  expect(JSON.parse(serializeConfiguration({ family: people }))).toEqual({ family: people });
});

it.each(['null', '{}', '{', '{"../bad":[]}', '{"family":"bad"}'])(
  'rejects bad imports: %s',
  (json) => {
    expect(() => parseConfiguration(json)).toThrow();
  },
);

it('rejects duplicate names and emails using the CLI normalization rules', () => {
  expect(() =>
    parseConfiguration(JSON.stringify({ family: [people[1], { ...people[2], name: ' BOB ' }] })),
  ).toThrow(expect.objectContaining({ code: 'duplicate-name' }));
  expect(() =>
    parseConfiguration(
      JSON.stringify({ family: [people[1], { ...people[2], email: 'BOB@example.com' }] }),
    ),
  ).toThrow(expect.objectContaining({ code: 'duplicate-email' }));
});

it('rejects globally impossible exclusions, unknown references and unsupported fields', () => {
  const impossible = [
    { ...people[0], exclusions: ['Stan'] },
    { ...people[1], exclusions: ['Stan'] },
    people[2],
  ];

  expect(() => parseConfiguration(JSON.stringify({ family: impossible }))).toThrow(
    expect.objectContaining({ code: 'impossible-assignment' }),
  );
  expect(() =>
    parseConfiguration(
      JSON.stringify({ family: [{ ...people[0], exclusions: ['Nobody'] }, people[1]] }),
    ),
  ).toThrow(expect.objectContaining({ code: 'unknown-exclusion' }));
  expect(() =>
    parseConfiguration(
      JSON.stringify({ family: [{ ...people[1], exclude: ['Stan'] }, people[2]] }),
    ),
  ).toThrow(expect.objectContaining({ code: 'unsupported-fields' }));
});

it('keeps exclusion references through a rename and cleans them on removal', () => {
  const editor = importEditor(JSON.stringify({ family: people }));
  const campaign = editor[0];

  campaign.participants[3].name = 'Michael';

  expect(exportEditor(editor).family[0].exclusions).toEqual(['Michael']);
  const updated = removeParticipant(campaign, campaign.participants[3].id);

  expect(exportEditor([updated]).family[0].exclusions).toBeUndefined();
});

it('blocks duplicated campaign IDs and stale exclusion references during export', () => {
  const editor = importEditor(JSON.stringify({ family: people }));

  expect(() => exportEditor([...editor, { ...editor[0], key: 'second' }])).toThrow(
    expect.objectContaining({ code: 'duplicate-campaign-id' }),
  );
  editor[0].participants[0].excludedIds.push('missing');
  expect(() => exportEditor(editor)).toThrow();
});
