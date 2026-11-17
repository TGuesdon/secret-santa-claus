export type ValidationCode =
  | 'participant-count'
  | 'invalid-participant'
  | 'missing-fields'
  | 'invalid-name'
  | 'invalid-email'
  | 'duplicate-name'
  | 'duplicate-email'
  | 'invalid-exclusions'
  | 'unknown-exclusion'
  | 'self-exclusion'
  | 'duplicate-exclusion'
  | 'invalid-campaign-id'
  | 'duplicate-campaign-id'
  | 'invalid-json'
  | 'invalid-configuration'
  | 'unsupported-fields'
  | 'impossible-assignment';

const messages: Record<ValidationCode, string> = {
  'participant-count': 'A campaign requires 2 to 500 participants.',
  'invalid-participant': 'Each participant must have a name and an email address.',
  'missing-fields': 'Missing name or email address.',
  'invalid-name': 'Names must contain 1 to 120 characters without control characters.',
  'invalid-email': 'Invalid email address.',
  'duplicate-name': 'Duplicate participant name.',
  'duplicate-email': 'Duplicate participant email address.',
  'invalid-exclusions': 'Participant exclusions must be an array of names.',
  'unknown-exclusion': 'An exclusion must name another participant in this campaign.',
  'self-exclusion': 'Self exclusions are not allowed.',
  'duplicate-exclusion': 'Duplicate participant exclusion.',
  'invalid-campaign-id': 'Invalid campaign identifier.',
  'duplicate-campaign-id': 'Duplicate campaign identifier.',
  'invalid-json': 'Invalid JSON configuration.',
  'invalid-configuration': 'A configuration must contain at least one campaign.',
  'unsupported-fields': 'Unsupported participant fields. Expected name, email and exclusions only.',
  'impossible-assignment': 'No valid assignment satisfies the participant exclusions.',
};

export class ValidationError extends Error {
  constructor(
    public readonly code: ValidationCode,
    public readonly participantIndex?: number,
    public readonly campaignId?: string,
  ) {
    super(messages[code]);
    this.name = 'ValidationError';
  }
}
