// @vitest-environment jsdom
import { cleanup, render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ConfigApp from '../src/config/ConfigApp';

const people = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Stan', email: 'stan@example.com' },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function importPeople() {
  const user = userEvent.setup();

  await user.click(screen.getByText('Importer un JSON'));
  fireEvent.change(screen.getByLabelText('Contenu JSON'), {
    target: { value: JSON.stringify({ family: people }) },
  });
  await user.click(screen.getByRole('button', { name: 'Lire le JSON' }));
  await user.click(screen.getByRole('button', { name: 'Remplacer la configuration' }));

  return user;
}

it('starts with a calm accessible editor and validates only after interaction', () => {
  render(<ConfigApp />);

  expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Prépare/);
  expect(
    screen.getAllByLabelText('Nom', { selector: 'input' })[0].getAttribute('required'),
  ).not.toBeNull();
  expect(document.querySelector('audio')).toBeNull();
  expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
});

it('imports, updates exclusion references through renames and copies valid JSON', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  render(<ConfigApp />);
  const user = await importPeople();

  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const alice = screen.getByRole('group', { name: 'Alice' });
  const bob = screen.getByRole('group', { name: 'Bob' });

  await user.selectOptions(
    within(alice).getByLabelText('Ajouter une exclusion'),
    within(alice).getByRole('option', { name: 'Bob' }),
  );
  await user.clear(within(bob).getByLabelText('Nom'));
  await user.type(within(bob).getByLabelText('Nom'), 'Bobby');
  expect(within(alice).getByRole('button', { name: 'Retirer Bobby des exclusions' })).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  await user.click(screen.getByRole('button', { name: 'Copier le JSON' }));

  expect(JSON.parse(writeText.mock.calls[0][0]).family[0].exclusions).toEqual(['Bobby']);
  expect(screen.getByRole('status').textContent).toMatch(/copié/);
});

it('shows email and duplicate failures with field context', async () => {
  render(<ConfigApp />);
  const user = await importPeople();
  const alice = screen.getByRole('group', { name: 'Alice' });

  await user.clear(within(alice).getByLabelText('E-mail'));
  await user.type(within(alice).getByLabelText('E-mail'), 'invalid');
  await user.tab();
  expect(within(alice).getByText(/adresse e-mail valide/)).toBeDefined();
  await user.clear(within(alice).getByLabelText('E-mail'));
  await user.type(within(alice).getByLabelText('E-mail'), 'BOB@example.com');
  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));

  expect(screen.getByRole('alert').textContent).toMatch(/déjà utilisée/);
  expect(screen.queryByRole('button', { name: 'Copier le JSON' })).toBeNull();
});

it('blocks impossible exclusions and recovers without losing the participants', async () => {
  render(<ConfigApp />);
  const user = await importPeople();

  for (const name of ['Alice', 'Bob']) {
    const person = screen.getByRole('group', { name });

    await user.selectOptions(
      within(person).getByLabelText('Ajouter une exclusion'),
      within(person).getByRole('option', { name: 'Stan' }),
    );
  }

  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  expect(screen.getByRole('alert').textContent).toMatch(/Aucun tirage possible/);
  await user.click(
    within(screen.getByRole('group', { name: 'Bob' })).getByRole('button', {
      name: 'Retirer Stan des exclusions',
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  expect(screen.getByLabelText('JSON généré')).toBeDefined();
});

it('keeps edits after invalid imports and clipboard failures', async () => {
  render(<ConfigApp />);
  const user = await importPeople();

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  });
  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  await user.click(screen.getByRole('button', { name: 'Copier le JSON' }));
  expect(screen.getByRole('status').textContent).toMatch(/copie automatique/);
  await user.click(screen.getByText('Importer un JSON'));
  fireEvent.change(screen.getByLabelText('Contenu JSON'), { target: { value: 'invalid' } });
  await user.click(screen.getByRole('button', { name: 'Lire le JSON' }));
  expect(screen.getByRole('alert').textContent).toMatch(/JSON/);
  expect(screen.getByRole('group', { name: 'Alice' })).toBeDefined();
});

it('creates campaigns and participants, cleans exclusions on deletion and confirms campaign removal', async () => {
  render(<ConfigApp />);
  const user = await importPeople();
  const alice = screen.getByRole('group', { name: 'Alice' });

  await user.selectOptions(
    within(alice).getByLabelText('Ajouter une exclusion'),
    within(alice).getByRole('option', { name: 'Bob' }),
  );
  await user.click(screen.getByRole('button', { name: 'Supprimer Bob' }));
  expect(within(alice).queryByRole('button', { name: 'Retirer Bob des exclusions' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Ajouter une personne' }));
  const added = screen.getByRole('group', { name: 'Personne 3' });

  expect(document.activeElement).toBe(within(added).getByLabelText('Nom'));
  await user.type(within(added).getByLabelText('Nom'), 'Michel');
  await user.type(within(added).getByLabelText('E-mail'), 'michel@example.com');
  await user.click(screen.getByRole('button', { name: 'Ajouter une campagne' }));
  await user.type(
    screen.getByRole('group', { name: 'Personne 1' }).querySelector('input')!,
    'Diane',
  );
  await user.click(screen.getByRole('button', { name: 'Supprimer la campagne' }));
  await user.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(screen.getByRole('group', { name: 'Diane' })).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Supprimer la campagne' }));
  await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
  expect(screen.getByRole('group', { name: 'Alice' })).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  expect(
    JSON.parse((screen.getByLabelText('JSON généré') as HTMLTextAreaElement).value).family,
  ).toHaveLength(3);
});

it('stages file imports and leaves the current campaign untouched when cancelled', async () => {
  render(<ConfigApp />);
  const user = await importPeople();
  const file = new File([JSON.stringify({ friends: people })], 'friends.json', {
    type: 'application/json',
  });

  // jsdom File does not implement Blob.text; keep the browser file boundary explicit.
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify({ friends: people }) });
  await user.click(screen.getByText('Importer un JSON'));
  await user.upload(screen.getByLabelText('Choisir un fichier JSON'), file);
  await user.click(screen.getByRole('button', { name: 'Lire le JSON' }));
  expect(screen.getByRole('button', { name: 'Remplacer la configuration' })).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Lire le JSON' }));
  expect((screen.getByLabelText('Identifiant de la campagne') as HTMLInputElement).value).toBe(
    'family',
  );
});

it('downloads the generated JSON and invalidates it after an edit', async () => {
  const blobs: Blob[] = [];

  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL(blob: Blob) {
        blobs.push(blob);

        return 'blob:configuration';
      }
      static revokeObjectURL() {}
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<ConfigApp />);
  const user = await importPeople();

  await user.click(screen.getByRole('button', { name: 'Vérifier et générer le JSON' }));
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Télécharger le JSON' }));
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  const contents = await new Promise<string>((resolve) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blobs[0]);
  });

  expect(JSON.parse(contents)).toEqual({ family: people });
  await user.type(within(screen.getByRole('group', { name: 'Alice' })).getByLabelText('Nom'), 'a');
  expect(screen.queryByLabelText('JSON généré')).toBeNull();
});

it('uses the same campaign ID rules on blur and export', async () => {
  render(<ConfigApp />);
  const user = userEvent.setup();
  const identifier = screen.getByLabelText('Identifiant de la campagne');

  await user.clear(identifier);
  await user.type(identifier, ' famille ');
  await user.tab();
  expect(identifier.getAttribute('aria-invalid')).toBe('true');
});

it('restores keyboard focus after cancelling and confirming campaign deletion', async () => {
  render(<ConfigApp />);
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: 'Supprimer la campagne' }));
  await user.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Supprimer la campagne' }),
  );
  await user.click(screen.getByRole('button', { name: 'Supprimer la campagne' }));
  await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ajouter une campagne' }));
});
