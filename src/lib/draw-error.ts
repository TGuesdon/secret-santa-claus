export type DrawErrorCode =
  | 'invalid-link'
  | 'unsupported-version'
  | 'invalid-draw'
  | 'load-failed'
  | 'not-found'
  | 'decryption-failed';

const diagnosticMessages: Record<DrawErrorCode, string> = {
  'invalid-link': 'Incomplete or invalid personal link.',
  'unsupported-version': 'Unsupported draw version.',
  'invalid-draw': 'Invalid public draw file.',
  'load-failed': 'Unable to load the draw. Check your connection and try again.',
  'not-found': 'No available draw matches this link.',
  'decryption-failed': 'Unable to decrypt this draw. Check your personal link.',
};

// Codes are the contract; diagnostic messages are never used for control flow.
export class DrawError extends Error {
  constructor(public readonly code: DrawErrorCode) {
    super(diagnosticMessages[code]);
    this.name = 'DrawError';
  }
}
