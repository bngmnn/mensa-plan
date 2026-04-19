export interface AlexaSkillConfig {
  apiBaseUrl: string;
  locationId: string;
  locationName: string;
  timeZone: string;
  invocationName: string;
}

export function getAlexaSkillConfig(
  env: NodeJS.ProcessEnv = process.env,
): AlexaSkillConfig {
  const apiBaseUrl =
    env.MENSA_API_BASE_URL?.trim() ||
    env.URL?.trim() ||
    env.DEPLOY_PRIME_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error(
      "MENSA_API_BASE_URL or a Netlify site URL must be configured for the Alexa skill.",
    );
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    locationId: env.MENSA_LOCATION_ID?.trim() || "164",
    locationName: env.MENSA_LOCATION_NAME?.trim() || "Mensa Finkenau",
    timeZone: env.MENSA_TIME_ZONE?.trim() || "Europe/Berlin",
    invocationName: env.ALEXA_INVOCATION_NAME?.trim() || "mensa plan hamburg",
  };
}
