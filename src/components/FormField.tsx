import { useId, useState, type ComponentProps } from 'react';

type Props = ComponentProps<'input'> & {
  label: string;
  hint?: string;
  error?: string;
  validate?: (value: string) => string | undefined;
};

export function FormField({ label, hint, error, validate, onChange, onBlur, ...props }: Props) {
  const id = useId();
  const [localError, setLocalError] = useState<string>();
  const message = error ?? localError;
  const description = [hint ? `${id}-hint` : '', message ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <input
        {...props}
        id={id}
        aria-invalid={message ? true : undefined}
        aria-describedby={description || undefined}
        onChange={(event) => {
          setLocalError(undefined);
          onChange?.(event);
        }}
        onBlur={(event) => {
          setLocalError(validate?.(event.currentTarget.value));
          onBlur?.(event);
        }}
      />
      {message && (
        <p className="field-error" id={`${id}-error`}>
          {message}
        </p>
      )}
    </div>
  );
}
