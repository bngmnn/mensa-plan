import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WeekMenuResponse } from "@mensa/shared";

import App from "./App.vue";

const sampleWeekMenu: WeekMenuResponse = {
  location: {
    id: "164",
    slug: "mensa-finkenau",
    name: "Mensa Finkenau",
    subtitle: "Standort Finkenau",
    sourceUrl: "https://www.stwhh.de/speiseplan?l=164&t=today",
  },
  fetchedAt: "2026-04-17T10:00:00.000Z",
  sourceUrl: "https://www.stwhh.de/speiseplan?l=164&t=this_week",
  isStale: false,
  warnings: [],
  days: [
    {
      serviceDate: "2026-04-17",
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
              prices: [
                { audience: "students", amount: 2.2, currency: "EUR" },
                { audience: "staff", amount: 3.5, currency: "EUR" },
                { audience: "guests", amount: 4.8, currency: "EUR" },
              ],
              sustainability: [
                { label: "CO₂ Ausstoß", rating: 2, value: "331 Gramm" },
              ],
            },
          ],
        },
      ],
      stats: {
        totalCategories: 1,
        totalDishes: 1,
      },
    },
  ],
};

const popoverPrototype = HTMLElement.prototype as HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-17T13:00:00.000Z"));
  popoverPrototype.showPopover ??= vi.fn();
  popoverPrototype.hidePopover ??= vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the fetched menu with weekday controls", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async () => {
      return {
        ok: true,
        json: async () => sampleWeekMenu,
      } as Response;
    });

    const wrapper = mount(App);

    await flushPromises();

    expect(wrapper.text()).toContain("Mensa Finkenau");
    expect(wrapper.text()).toContain("Gemüsegulasch");
    expect(wrapper.text()).toContain("Fr., 17.");
    expect(wrapper.text()).toContain("heute");
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/locations/164/menu/week"),
    );
  });
});
