import { wording } from '../locales/fr';

type StageCurtainProps = {
  closed: boolean;
  onOpen: () => void;
};

export function StageCurtain({ closed, onOpen }: StageCurtainProps) {
  return (
    <div className={`stage-curtain ${closed ? '' : 'is-open'}`}>
      <div className="curtain-fabric" aria-hidden="true">
        <div className="curtain-panel curtain-left" />
        <div className="curtain-panel curtain-right" />
      </div>
      {closed && (
        <button
          className="curtain-trigger"
          type="button"
          aria-label={wording.curtain.action}
          onClick={onOpen}
        />
      )}
    </div>
  );
}
