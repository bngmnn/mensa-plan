import { describe, expect, it } from "vitest";

import type { MenuResponse } from "@mensa/shared";

import { buildMenuSpeech, buildWelcomeSpeech } from "../src/speech";

const sampleMenu: MenuResponse = {
  location: {
    id: "164",
    slug: "mensa-finkenau",
    name: "Mensa Finkenau",
    subtitle: "Standort Finkenau",
    sourceUrl: "https://www.stwhh.de/speiseplan?l=164&t=today",
  },
  serviceDate: "2026-04-17",
  fetchedAt: "2026-04-17T10:00:00.000Z",
  sourceUrl: "https://www.stwhh.de/speiseplan?l=164&t=today",
  isStale: false,
  warnings: [],
  categories: [
    {
      name: "Pottkieker",
      dishes: [
        {
          id: "dish-1",
          name: "Gemüsegulasch",
          category: "Pottkieker",
          indicators: [{ label: "Vegan" }],
          allergens: [],
          prices: [{ audience: "students", amount: 2.2, currency: "EUR" }],
          sustainability: [],
        },
      ],
    },
  ],
  stats: {
    totalCategories: 1,
    totalDishes: 1,
  },
};

describe("speech helpers", () => {
  it("builds a welcome prompt", () => {
    expect(buildWelcomeSpeech("Mensa Finkenau")).toContain(
      "Willkommen beim Mensa Finkenau Plan",
    );
  });

  it("summarizes the menu in spoken German", () => {
    expect(buildMenuSpeech(sampleMenu)).toContain("Am Freitag, 17. April");
    expect(buildMenuSpeech(sampleMenu)).toContain("Gemüsegulasch");
    expect(buildMenuSpeech(sampleMenu)).toContain("Vegan");
  });
});
