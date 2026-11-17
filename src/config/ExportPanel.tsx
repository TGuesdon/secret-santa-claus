import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { wording } from '../locales/fr';

const text = wording.config;

export function ExportPanel({ json, onExport }: { json: string | null; onExport: () => void }) {
  const [feedback, setFeedback] = useState<{ json: string; message: string } | null>(null);
  const currentJson = useRef(json);
  const output = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    currentJson.current = json;
  }, [json]);

  async function copy() {
    if (!json) {
      return;
    }

    try {
      await navigator.clipboard.writeText(json);

      if (currentJson.current === json) {
        setFeedback({ json, message: text.copied });
        onExport();
      }
    } catch {
      if (currentJson.current === json) {
        setFeedback({ json, message: text.copyFailed });
        output.current?.focus();
        output.current?.select();
      }
    }
  }

  function download() {
    if (!json) {
      return;
    }

    let url: string | undefined;

    try {
      url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = 'secret-santa-config.json';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setFeedback({ json, message: text.downloaded });
      onExport();
    } catch {
      setFeedback({ json, message: text.downloadFailed });
    } finally {
      if (url) {
        const downloadUrl = url;

        // Leave the URL alive long enough for the browser to start the download.
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
    }
  }

  return (
    <section className="export-panel" aria-labelledby="export-title">
      <div className="export-introduction">
        <div>
          <h2 id="export-title">{json ? text.generatedTitle : text.exportTitle}</h2>
          <p>{json ? text.generatedHint : text.exportHint}</p>
        </div>
        {!json && (
          <Button variant="primary" type="submit" form="configuration-form">
            <Icon name="check" />
            {text.generate}
          </Button>
        )}
      </div>
      {json && (
        <>
          <div className="json-toolbar">
            <label htmlFor="configuration-output">{text.generatedLabel}</label>
            <div className="button-row">
              <Button onClick={() => void copy()}>
                <Icon name="copy" />
                {text.copy}
              </Button>
              <Button onClick={download}>
                <Icon name="download" />
                {text.download}
              </Button>
            </div>
          </div>
          <textarea
            id="configuration-output"
            ref={output}
            value={json}
            readOnly
            rows={12}
            spellCheck={false}
          />
        </>
      )}
      <p className="export-feedback" role="status">
        {feedback?.json === json ? feedback.message : ''}
      </p>
    </section>
  );
}
