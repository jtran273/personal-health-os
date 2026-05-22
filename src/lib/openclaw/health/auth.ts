export interface OpenClawAuthResult {
  ok: boolean;
  status: 200 | 401 | 503;
  code?: "openclaw_health_token_missing" | "openclaw_health_token_required" | "openclaw_health_token_invalid";
  message?: string;
}

export function authenticateOpenClawHealthRequest(
  headers: Headers,
  configuredToken = process.env.OPENCLAW_HEALTH_TOKEN
): OpenClawAuthResult {
  if (!configuredToken) {
    return {
      ok: false,
      status: 503,
      code: "openclaw_health_token_missing",
      message: "OPENCLAW_HEALTH_TOKEN is not configured for this environment."
    };
  }

  const authorization = headers.get("authorization");
  if (!authorization) {
    return {
      ok: false,
      status: 401,
      code: "openclaw_health_token_required",
      message: "Bearer authorization is required."
    };
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match || match[1] !== configuredToken) {
    return {
      ok: false,
      status: 401,
      code: "openclaw_health_token_invalid",
      message: "Bearer authorization is invalid."
    };
  }

  return { ok: true, status: 200 };
}

