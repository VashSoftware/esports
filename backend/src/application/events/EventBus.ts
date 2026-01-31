import type { DomainEvent } from "../../domain/events/DomainEvent";

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private allHandlers: Set<EventHandler> = new Set();

  subscribe<T extends DomainEvent>(
    type: T["type"],
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    return () => {
      this.handlers.get(type)?.delete(handler as EventHandler);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.allHandlers.add(handler);
    return () => {
      this.allHandlers.delete(handler);
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? new Set();

    const allPromises: Promise<void>[] = [];

    for (const handler of handlers) {
      const result = handler(event);
      if (result instanceof Promise) {
        allPromises.push(result);
      }
    }

    for (const handler of this.allHandlers) {
      const result = handler(event);
      if (result instanceof Promise) {
        allPromises.push(result);
      }
    }

    await Promise.all(allPromises);
  }

  clear(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }
}
