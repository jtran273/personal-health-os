import type { RawHealthEvent } from "@/lib/health";

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

async function fetchOuraCollection(
  collection: "daily_sleep" | "daily_readiness" | "daily_activity",
  options: OuraFetchOptions
): Promise<RawHealthEvent[]> {
  const token = options.token ?? process.env.OURA_PAT;
  if (!token) {
    throw new Error("OURA_PAT is required to sync Oura data.");
  }

  const url = new URL(`${ouraBaseUrl}/${collection}`);
  url.searchParams.set("start_date", options.startDate);
  url.searchParams.set("end_date", options.endDate);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Oura ${collection} fetch failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  const receivedAt = new Date().toISOString();

  return (payload.data ?? []).map((item, index) => ({
    id: `oura:${collection}:${options.startDate}:${index}`,
    source: "oura",
    type: collection,
    observedAt: options.startDate,
    receivedAt,
    payload: item
  }));
}
