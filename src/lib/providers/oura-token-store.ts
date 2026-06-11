import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface OuraTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope?: string;
  tokenType?: string;
}

const defaultTokenPath = () => join(process.cwd(), ".data", "oura-tokens.json");

export function resolveOuraTokenPath(path?: string): string {
  return path ?? process.env.OURA_TOKEN_PATH ?? defaultTokenPath();
}

export async function readOuraTokens(path?: string): Promise<OuraTokenSet | null> {
  try {
    const raw = await readFile(resolveOuraTokenPath(path), "utf8");
    const parsed = JSON.parse(raw) as Partial<OuraTokenSet>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      scope: typeof parsed.scope === "string" ? parsed.scope : undefined,
      tokenType: typeof parsed.tokenType === "string" ? parsed.tokenType : undefined
    };
  } catch {
    return null;
  }
}

export async function writeOuraTokens(tokens: OuraTokenSet, path?: string): Promise<void> {
  const tokenPath = resolveOuraTokenPath(path);
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
}

export async function clearOuraTokens(path?: string): Promise<void> {
  await rm(resolveOuraTokenPath(path), { force: true });
}
