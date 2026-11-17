import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Icon } from '../components/Icons';
import {
  exportEditor,
  newCampaign,
  newParticipant,
  removeParticipant,
  serializeConfiguration,
  type EditorCampaign,
} from '../lib/configuration';
import { validateCampaignId } from '../lib/link';
import { ValidationError } from '../lib/validation-error';
import { wording } from '../locales/fr';
import { ExportPanel } from './ExportPanel';
import { ImportPanel } from './ImportPanel';
import { ParticipantEditor } from './ParticipantEditor';
import { fieldValidator, validationMessage } from './messages';

const text = wording.config;

export default function ConfigApp() {
  const [campaigns, setCampaigns] = useState<EditorCampaign[]>(() => [newCampaign('famille')]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [issue, setIssue] = useState<{ error: unknown; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const addCampaignButton = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const active = campaigns.find((campaign) => campaign.key === activeKey) ?? campaigns[0];
  const validationError = issue?.error instanceof ValidationError ? issue.error : undefined;

  useEffect(() => {
    if (!dirty) {
      return;
    }

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', warnBeforeLeaving);

    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => {
    if (issue) {
      summary.current?.focus();
    }
  }, [issue]);

  useEffect(() => {
    if (pendingFocus.current) {
      const field =
        pendingFocus.current === 'add-campaign'
          ? addCampaignButton.current
          : form.current?.elements.namedItem(pendingFocus.current);

      if (field instanceof HTMLElement) {
        field.focus();
      }

      pendingFocus.current = null;
    }
  });

  function changeCampaigns(next: EditorCampaign[]) {
    setCampaigns(next);
    setGenerated(null);
    setIssue(null);
    setDirty(true);
  }

  function updateActive(next: EditorCampaign) {
    changeCampaigns(campaigns.map((campaign) => (campaign.key === next.key ? next : campaign)));
  }

  function addCampaign() {
    let number = campaigns.length + 1;

    while (campaigns.some((campaign) => campaign.id === `campagne-${number}`)) {
      number++;
    }

    const campaign = newCampaign(`campagne-${number}`);

    changeCampaigns([...campaigns, campaign]);
    setActiveKey(campaign.key);
    setPendingDelete(null);
    pendingFocus.current = `campaign-${campaign.key}`;
  }

  function generate() {
    try {
      const configuration = exportEditor(campaigns);

      setGenerated(serializeConfiguration(configuration));
      setIssue(null);
    } catch (error) {
      setGenerated(null);
      const message = validationMessage(error);

      if (error instanceof ValidationError) {
        const invalidCampaign = campaigns.find((campaign) => campaign.id === error.campaignId);

        if (invalidCampaign) {
          setActiveKey(invalidCampaign.key);
        }

        setIssue({ error, message: text.issue(error.campaignId, error.participantIndex, message) });
      } else {
        setIssue({ error, message });
      }
    }
  }

  return (
    <div className="config-app">
      <header className="site-header config-header">
        <a href={import.meta.env.BASE_URL} className="brand-link">
          <Brand as="span" />
        </a>
        <a className="config-back" href={import.meta.env.BASE_URL}>
          {text.back}
          <Icon name="arrow" />
        </a>
      </header>
      <main className="config-main">
        <div className="config-intro">
          <div>
            <h1>
              {text.title}
              <br />
              <em>{text.titleEmphasis}</em>
            </h1>
            <p>{text.introduction}</p>
          </div>
          <div className="config-privacy">
            <Icon name="gift" />
            <p>
              {text.privacy}
              <br />
              <strong>{text.privacyNote}</strong>
            </p>
          </div>
        </div>
        <ImportPanel
          onImport={(imported) => {
            changeCampaigns(imported);
            setActiveKey(imported[0].key);
            setPendingDelete(null);
            pendingFocus.current = `campaign-${imported[0].key}`;
          }}
        />
        <div className="config-workspace">
          <aside className="campaign-sidebar">
            <h2>
              {text.campaigns}
              <span className="campaign-count">{campaigns.length}</span>
            </h2>
            <nav aria-label={text.campaigns}>
              {campaigns.map((campaign) => (
                <button
                  key={campaign.key}
                  type="button"
                  className="campaign-choice"
                  aria-current={campaign.key === active?.key ? 'page' : undefined}
                  onClick={() => {
                    setActiveKey(campaign.key);
                    setPendingDelete(null);
                  }}
                >
                  <Icon name="gift" />
                  <span>
                    <strong>{campaign.id || text.unnamedCampaign}</strong>
                    <small>{text.participantCount(campaign.participants.length)}</small>
                  </span>
                </button>
              ))}
            </nav>
            <Button className="add-campaign" ref={addCampaignButton} onClick={addCampaign}>
              <Icon name="plus" />
              {text.addCampaign}
            </Button>
          </aside>
          <div className="campaign-content">
            {issue && (
              <div className="validation-summary" role="alert" tabIndex={-1} ref={summary}>
                <h2>{text.invalidTitle}</h2>
                <p>{issue.message}</p>
              </div>
            )}
            <form
              id="configuration-form"
              ref={form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                generate();
              }}
            >
              {active ? (
                <section
                  className="campaign-editor"
                  aria-labelledby="campaign-title"
                  key={active.key}
                >
                  <div className="campaign-topline">
                    <h2 id="campaign-title">{active.id || text.unnamedCampaign}</h2>
                    <Button
                      className="icon-button"
                      name="delete-campaign"
                      aria-label={text.removeCampaign}
                      onClick={() => setPendingDelete(active.key)}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                  {pendingDelete === active.key && (
                    <div className="delete-confirmation">
                      <p>{text.confirmRemove}</p>
                      <div className="button-row">
                        <Button
                          onClick={() => {
                            const remaining = campaigns.filter(
                              (campaign) => campaign.key !== active.key,
                            );

                            changeCampaigns(remaining);
                            pendingFocus.current = remaining[0]
                              ? `campaign-${remaining[0].key}`
                              : 'add-campaign';
                            setPendingDelete(null);
                            setActiveKey(null);
                          }}
                        >
                          {text.confirm}
                        </Button>
                        <Button
                          onClick={() => {
                            setPendingDelete(null);
                            pendingFocus.current = 'delete-campaign';
                          }}
                        >
                          {text.cancel}
                        </Button>
                      </div>
                    </div>
                  )}
                  <FormField
                    label={text.campaignId}
                    hint={text.campaignHint}
                    name={`campaign-${active.key}`}
                    value={active.id}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    maxLength={64}
                    pattern="[a-z0-9][a-z0-9-]{0,63}"
                    validate={fieldValidator(validateCampaignId, false)}
                    error={
                      validationError &&
                      validationError.campaignId === active.id &&
                      ['invalid-campaign-id', 'duplicate-campaign-id'].includes(
                        validationError.code,
                      )
                        ? validationMessage(validationError)
                        : undefined
                    }
                    onChange={(event) => updateActive({ ...active, id: event.target.value })}
                  />
                  <div className="participants-heading">
                    <h3>
                      <Icon name="people" />
                      {text.participants}
                    </h3>
                    <p>{text.requiredHint}</p>
                  </div>
                  <p className="exclusion-guide">{text.exclusionHint}</p>
                  <div className="participant-list">
                    {active.participants.map((participant, index) => (
                      <ParticipantEditor
                        key={participant.id}
                        participant={participant}
                        participants={active.participants}
                        index={index}
                        issue={
                          validationError?.campaignId === active.id &&
                          validationError.participantIndex === index
                            ? validationError
                            : undefined
                        }
                        onChange={(next) =>
                          updateActive({
                            ...active,
                            participants: active.participants.map((person) =>
                              person.id === next.id ? next : person,
                            ),
                          })
                        }
                        onRemove={() => {
                          updateActive(removeParticipant(active, participant.id));
                          pendingFocus.current = `campaign-${active.key}`;
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    className="add-person"
                    disabled={active.participants.length >= 500}
                    onClick={() => {
                      const participant = newParticipant();

                      updateActive({
                        ...active,
                        participants: [...active.participants, participant],
                      });
                      pendingFocus.current = `person-${participant.id}-name`;
                    }}
                  >
                    <Icon name="plus" />
                    {text.addPerson}
                  </Button>
                </section>
              ) : (
                <p className="config-empty">{text.empty}</p>
              )}
            </form>
            <ExportPanel json={generated} onExport={() => setDirty(false)} />
          </div>
        </div>
      </main>
      <footer className="config-footer">
        <Brand as="span" />
        <p>{wording.footer.motto}</p>
      </footer>
    </div>
  );
}
