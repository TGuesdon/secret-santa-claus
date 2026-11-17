import { Icon } from './Icons';
import { wording } from '../locales/fr';

export function Brand({ as: Element = 'h1' }: { as?: 'h1' | 'span' }) {
  return (
    <Element className="brand">
      <Icon name="gift" />
      <span>
        {wording.brand}
        <span className="brand-dot" aria-hidden="true">
          .
        </span>
      </span>
    </Element>
  );
}
