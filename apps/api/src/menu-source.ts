import { buildSourceUrl } from "./locations";

export interface MenuSource {
  fetchMenuPage(locationId: string, day: string): Promise<string>;
}

export class StwhhMenuSource implements MenuSource {
  async fetchMenuPage(locationId: string, day: string): Promise<string> {
    const response = await fetch(buildSourceUrl(locationId, day), {
      headers: {
        "user-agent": "mensa-plan/1.0 (+github-copilot-cli)",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Upstream menu request failed with status ${response.status}`,
      );
    }

    return response.text();
  }
}
