import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RawHealthEvent } from "./types";
import { validateRawHealthEvent } from "./validation";

export interface RawHealthEventStore {
  insert(event: RawHealthEvent): Promise<StoreWriteResult>;
  insertMany(events: RawHealthEvent[]): Promise<StoreWriteResult>;
  list(query?: RawHealthEventQuery): Promise<RawHealthEvent[]>;
  clear(): Promise<void>;
}

export interface RawHealthEventQuery {
  source?: RawHealthEvent["source"];
  type?: string;
  from?: string;
  to?: string;
}

export interface StoreWriteResult {
  inserted: number;
  skipped: number;
  ids: string[];
}

export function prepareRawHealthEvent(event: RawHealthEvent): RawHealthEvent {
  const valid = validateRawHealthEvent(event);
  return {
    ...valid,
    id: valid.id || deterministicRawEventId(valid)
  };
}

export function deterministicRawEventId(event: Pick<RawHealthEvent, "source" | "type" | "observedAt" | "externalId">): string {
  const naturalKey = [
    event.source,
    event.type,
    event.externalId ?? event.observedAt
  ].join("|");
  return createHash("sha256").update(naturalKey).digest("hex").slice(0, 24);
}

export class InMemoryRawHealthEventStore implements RawHealthEventStore {
  private events = new Map<string, RawHealthEvent>();

  async insert(event: RawHealthEvent): Promise<StoreWriteResult> {
    return this.insertMany([event]);
  }

  async insertMany(events: RawHealthEvent[]): Promise<StoreWriteResult> {
    let inserted = 0;
    let skipped = 0;
    const ids: string[] = [];

    for (const event of events) {
      const prepared = prepareRawHealthEvent(event);
      ids.push(prepared.id);
      if (this.events.has(prepared.id)) {
        skipped += 1;
        continue;
      }
      this.events.set(prepared.id, prepared);
      inserted += 1;
    }

    return { inserted, skipped, ids };
  }

  async list(query: RawHealthEventQuery = {}): Promise<RawHealthEvent[]> {
    return filterEvents([...this.events.values()], query);
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}

export class JsonlRawHealthEventStore implements RawHealthEventStore {
  constructor(private readonly filePath: string) {}

  async insert(event: RawHealthEvent): Promise<StoreWriteResult> {
    return this.insertMany([event]);
  }

  async insertMany(events: RawHealthEvent[]): Promise<StoreWriteResult> {
    const existing = await this.readAll();
    const knownIds = new Set(existing.map((event) => event.id));
    const lines: string[] = [];
    let inserted = 0;
    let skipped = 0;
    const ids: string[] = [];

    for (const event of events) {
      const prepared = prepareRawHealthEvent(event);
      ids.push(prepared.id);
      if (knownIds.has(prepared.id)) {
        skipped += 1;
        continue;
      }
      knownIds.add(prepared.id);
      lines.push(JSON.stringify(prepared));
      inserted += 1;
    }

    if (lines.length > 0) {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, `${lines.join("\n")}\n`, "utf8");
    }

    return { inserted, skipped, ids };
  }

  async list(query: RawHealthEventQuery = {}): Promise<RawHealthEvent[]> {
    return filterEvents(await this.readAll(), query);
  }

  async clear(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, "", "utf8");
    await rename(tempPath, this.filePath);
  }

  private async readAll(): Promise<RawHealthEvent[]> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isNotFoundError(error)) return [];
      throw error;
    }

    return contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => prepareRawHealthEvent(JSON.parse(line) as RawHealthEvent))
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  }
}

function filterEvents(events: RawHealthEvent[], query: RawHealthEventQuery): RawHealthEvent[] {
  return events.filter((event) => {
    if (query.source && event.source !== query.source) return false;
    if (query.type && event.type !== query.type) return false;
    if (query.from && event.observedAt < query.from) return false;
    if (query.to && event.observedAt > query.to) return false;
    return true;
  });
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
