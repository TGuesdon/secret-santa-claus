import type { ComponentProps } from 'react';

export function Button({
  variant = 'quiet',
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'quiet' }) {
  return <button type={type} className={`${variant}-button ${className}`} {...props} />;
}
