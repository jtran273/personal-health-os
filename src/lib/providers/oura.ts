import type { RawHealthEvent } from "@/lib/health";
import { deterministicRawEventId } from "@/lib/health/ledger";
import { getOuraAccessToken } from "./oura-oauth";

const ouraBaseUrl = "https://api.ouraring.com/v2/usercollection";

interface OuraFetchOptions {
  startDate: string;
  endDate: string;
  token?: string;
}

export async function fetchOuraDailySleep(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_sleep", options);
}

export async function fetchOuraSleepPeriods(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("sleep", options);
}

export async function fetchOuraDailyReadiness(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_readiness", options);
}

export async function fetchOuraDailyActivity(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_activity", options);
}

export async function fetchOuraDailyResilience(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_resilience", options);
}

export async function fetchOuraDailyCardiovascularAge(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_cardiovascular_age", options);
}

export async function fetchOuraDailySpo2(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_spo2", options);
}

export async function fetchOuraDailyStress(
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  return fetchOuraCollection("daily_stress", options);
}

type OuraCollection =
  | "sleep"
  | "daily_sleep"
  | "daily_readiness"
  | "daily_activity"
  | "daily_resilience"
  | "daily_cardiovascular_age"
  | "daily_spo2"
  | "daily_stress";

async function fetchOuraCollection(
  collection: OuraCollection,
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  const usingInjectedToken = typeof options.token === "string";
  const token = options.token ?? (await getOuraAccessToken());
  if (!token) {
    throw new Error(
      "Oura credentials missing: OURA_PAT is required, or connect via /api/integrations/oura/connect."
    );
  }

  const url = new URL(`${ouraBaseUrl}/${collection}`);
  url.searchParams.set("start_date", options.startDate);
  url.searchParams.set("end_date", options.endDate);

  let response = await fetchOuraWithToken(url, token);

  if (response.status === 401 && !usingInjectedToken) {
    const refreshedToken = await getOuraAccessToken({ forceRefresh: true }).catch(() => null);
    if (refreshedToken && refreshedToken !== token) {
      response = await fetchOuraWithToken(url, refreshedToken);
    }
  }

  if (!response.ok) {
    throw new Error(`Oura ${collection} fetch failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  const receivedAt = new Date().toISOString();

  return (payload.data ?? []).map((item, index) => {
    const externalId = readString(item, "id") ?? `${collection}:${readString(item, "day") ?? options.startDate}:${index}`;
    const observedDay = readString(item, "day") ?? options.startDate;
    const event: RawHealthEvent = {
      id: "",
      source: "oura",
      type: collection,
      observedAt: `${observedDay}T00:00:00.000Z`,
      receivedAt,
      externalId,
      payload: item
    };

    return { ...event, id: deterministicRawEventId(event) };
  });
}

async function fetchOuraWithToken(url: URL, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

function readString(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
