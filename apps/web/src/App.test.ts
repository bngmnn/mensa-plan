import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DishImageResponse, MenuResponse } from "@mensa/shared";

import App from "./App.vue";

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
  it("renders the fetched menu with weekday controls and image links", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/v1/images/search")) {
        const imageResponse: DishImageResponse = {
          query: "Gemüsegulasch",
          result: {
            id: 123,
            title: "Gemüsegulasch",
            imageUrl: "https://cdn.pixabay.com/photo/123.jpg",
            sourceUrl: "https://pixabay.com/photos/gemuesegulasch-123/",
            source: "pixabay",
          },
        };

        return {
          ok: true,
          json: async () => imageResponse,
        } as Response;
      }

      return {
        ok: true,
        json: async () => sampleMenu,
      } as Response;
    });

    const wrapper = mount(App);

    await flushPromises();

    expect(wrapper.text()).toContain("Mensa Finkenau");
    expect(wrapper.text()).toContain("Gemüsegulasch");
    expect(wrapper.text()).toContain("Menu overview");
    expect(wrapper.text()).toContain("Live from API");
    expect(wrapper.text()).toContain("Matched via Pixabay");
    expect(wrapper.text()).toContain("Open Pixabay image");
    expect(wrapper.text()).toContain("13 – 17. April 2026");
    expect(wrapper.text()).toContain("Fr., 17.");
    expect(wrapper.text()).toContain("Today");
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/locations/164/menu?day=today"),
    );
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/images/search?q=Gem%C3%BCsegulasch"),
    );
  });
});
