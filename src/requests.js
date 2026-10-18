import { randomUUID } from 'node:crypto';

export class InputError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

export function createRequestStore() {
  const requests = [];
  return {
    list() {
      return requests.map((request) => ({ ...request }));
    },
    create(input) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new InputError('Request body must be a JSON object.');
      }
      if (typeof input.requesterName !== 'string' || input.requesterName.trim() === '') {
        throw new InputError('Requester name is required.', 'requesterName');
      }
      if (input.description !== undefined && typeof input.description !== 'string') {
        throw new InputError('Description must be text.', 'description');
      }
      const request = {
        id: randomUUID(),
        requesterName: input.requesterName.trim(),
        description: input.description ?? ''
      };
      requests.push(request);
      return { ...request };
    }
  };
}
