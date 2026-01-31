export interface DomainEvent<T = unknown> {
  type: string;
  timestamp: Date;
  payload: T;
}

export function createEvent<T>(type: string, payload: T): DomainEvent<T> {
  return {
    type,
    timestamp: new Date(),
    payload,
  };
}
