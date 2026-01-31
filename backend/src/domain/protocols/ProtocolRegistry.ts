import type { IMatchProtocol } from "./IMatchProtocol";

export class ProtocolRegistry {
  private protocols: Map<string, IMatchProtocol> = new Map();

  register(protocol: IMatchProtocol): void {
    if (this.protocols.has(protocol.name)) {
      throw new Error(`Protocol "${protocol.name}" is already registered`);
    }
    this.protocols.set(protocol.name, protocol);
  }

  get(name: string): IMatchProtocol {
    const protocol = this.protocols.get(name);
    if (!protocol) {
      throw new Error(`Protocol "${name}" not found`);
    }
    return protocol;
  }

  has(name: string): boolean {
    return this.protocols.has(name);
  }

  list(): IMatchProtocol[] {
    return Array.from(this.protocols.values());
  }

  names(): string[] {
    return Array.from(this.protocols.keys());
  }
}
