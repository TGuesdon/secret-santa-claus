import { useId } from 'react';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Icon } from '../components/Icons';
import type { EditorParticipant } from '../lib/configuration';
import { validateEmail, validateName } from '../lib/participants';
import type { ValidationError } from '../lib/validation-error';
import { wording } from '../locales/fr';
import { fieldValidator, validationMessage } from './messages';

const text = wording.config;

type Props = {
  participant: EditorParticipant;
  participants: EditorParticipant[];
  index: number;
  issue?: ValidationError;
  onChange: (participant: EditorParticipant) => void;
  onRemove: () => void;
};

export function ParticipantEditor({
  participant,
  participants,
  index,
  issue,
  onChange,
  onRemove,
}: Props) {
  const selectId = useId();
  const displayName = participant.name.trim() || text.person(index);
  const available = participants.filter(
    (person) =>
      person.id !== participant.id &&
      !participant.excludedIds.includes(person.id) &&
      person.name.trim(),
  );
  const nameIssue =
    issue && ['invalid-name', 'missing-fields', 'duplicate-name'].includes(issue.code);
  const emailIssue = issue && ['invalid-email', 'duplicate-email'].includes(issue.code);

  return (
    <fieldset className="participant-editor">
      <legend>{displayName}</legend>
      <div className="participant-fields">
        <FormField
          label={text.name}
          name={`person-${participant.id}-name`}
          value={participant.name}
          autoComplete={`section-${participant.id} name`}
          placeholder={text.namePlaceholder}
          required
          maxLength={120}
          validate={fieldValidator(validateName)}
          error={nameIssue ? validationMessage(issue) : undefined}
          onChange={(event) => onChange({ ...participant, name: event.target.value })}
        />
        <FormField
          label={text.email}
          name={`person-${participant.id}-email`}
          value={participant.email}
          type="email"
          inputMode="email"
          autoComplete={`section-${participant.id} email`}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={text.emailPlaceholder}
          required
          maxLength={254}
          validate={fieldValidator(validateEmail)}
          error={emailIssue ? validationMessage(issue) : undefined}
          onChange={(event) => onChange({ ...participant, email: event.target.value })}
        />
        <Button
          className="icon-button remove-person"
          aria-label={text.removePerson(displayName)}
          onClick={onRemove}
        >
          <Icon name="trash" />
        </Button>
      </div>
      <div className="exclusion-editor">
        <div className="exclusion-select">
          <label htmlFor={selectId}>{text.exclusions}</label>
          <select
            id={selectId}
            name={`person-${participant.id}-exclusion`}
            value=""
            disabled={available.length === 0}
            onChange={(event) => {
              if (event.target.value) {
                onChange({
                  ...participant,
                  excludedIds: [...participant.excludedIds, event.target.value],
                });
              }
            }}
          >
            <option value="">
              {available.length ? text.exclusionPlaceholder : text.noExclusionOptions}
            </option>
            {available.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name.trim()}
              </option>
            ))}
          </select>
        </div>
        {participant.excludedIds.length > 0 ? (
          <ul className="exclusion-chips">
            {participant.excludedIds.map((id) => {
              const excluded = participants.find((person) => person.id === id);
              const name =
                excluded?.name.trim() ||
                text.person(participants.findIndex((person) => person.id === id));

              return (
                <li key={id}>
                  <Button
                    className="exclusion-chip"
                    aria-label={text.removeExclusion(name)}
                    onClick={() =>
                      onChange({
                        ...participant,
                        excludedIds: participant.excludedIds.filter(
                          (excludedId) => excludedId !== id,
                        ),
                      })
                    }
                  >
                    {name}
                    <Icon name="close" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="exclusion-empty">{text.noExclusions}</p>
        )}
      </div>
    </fieldset>
  );
}
