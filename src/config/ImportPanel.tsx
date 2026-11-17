import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { importEditor, type EditorCampaign } from '../lib/configuration';
import { wording } from '../locales/fr';
import { validationMessage } from './messages';

const text = wording.config;

export function ImportPanel({ onImport }: { onImport: (campaigns: EditorCampaign[]) => void }) {
  const [json, setJson] = useState('');
  const [staged, setStaged] = useState<EditorCampaign[] | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const revision = useRef(0);
  const panel = useRef<HTMLDetailsElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!staged && restoreFocus.current) {
      readButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [staged]);

  function changeJson(value: string) {
    revision.current++;
    setJson(value);
    setStaged(null);
    setError('');
  }

  async function readFile(file?: File) {
    if (!file) {
      return;
    }

    changeJson('');
    const currentRevision = revision.current;

    setReading(true);

    try {
      const contents = await file.text();

      if (currentRevision === revision.current) {
        setJson(contents);
      }
    } catch {
      if (currentRevision === revision.current) {
        setError(text.importFailed);
      }
    } finally {
      setReading(false);
    }
  }

  function readJson() {
    try {
      setStaged(importEditor(json));
      setError('');
    } catch (error) {
      setStaged(null);
      setError(validationMessage(error));
    }
  }

  return (
    <details className="import-panel" ref={panel}>
      <summary>
        <Icon name="upload" />
        {text.importTitle}
      </summary>
      <div className="import-content">
        <p>{text.importHint}</p>
        <label className="file-label" htmlFor="configuration-file">
          {text.importFile}
        </label>
        <input
          id="configuration-file"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <label htmlFor="configuration-import">{text.importLabel}</label>
        <textarea
          id="configuration-import"
          value={json}
          onChange={(event) => changeJson(event.target.value)}
          rows={6}
          spellCheck={false}
          autoCapitalize="none"
          aria-describedby={error ? 'import-error' : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <p className="field-error" id="import-error" role="alert">
            {error}
          </p>
        )}
        {staged ? (
          <div className="import-confirmation">
            <p>{text.importReady(staged.length)}</p>
            <div className="button-row">
              <Button
                variant="primary"
                onClick={() => {
                  onImport(staged);
                  setStaged(null);
                  if (panel.current) {
                    panel.current.open = false;
                  }
                }}
              >
                {text.importReplace}
              </Button>
              <Button
                onClick={() => {
                  restoreFocus.current = true;
                  setStaged(null);
                }}
              >
                {text.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button ref={readButton} onClick={readJson} disabled={reading}>
            {text.importRead}
          </Button>
        )}
      </div>
    </details>
  );
}
