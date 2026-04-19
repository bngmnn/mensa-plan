import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildSourceUrl, getLocation } from "../src/locations";
import { parseMenuPage } from "../src/menu-parser";

describe("parseMenuPage", () => {
  it("extracts categories, dishes, prices, badges, and filters by day", async () => {
    const html = await readFile(
      join(import.meta.dirname, "fixtures", "finkenau-today.html"),
      "utf-8",
    );

    const menu = parseMenuPage({
      html,
      location: getLocation("164"),
      serviceDate: "2026-04-17",
      fetchedAt: "2026-04-17T10:00:00.000Z",
      sourceUrl: buildSourceUrl("164", "today"),
    });

    expect(menu.stats.totalCategories).toBe(2);
    expect(menu.stats.totalDishes).toBe(2);
    expect(menu.categories[0]?.name).toBe("Pottkieker");
    expect(menu.categories[0]?.dishes[0]?.prices[0]).toEqual({
      audience: "students",
      amount: 2.2,
      currency: "EUR",
    });
    expect(menu.categories[0]?.dishes[0]?.indicators[0]?.label).toBe("Vegan");
    expect(menu.categories[0]?.dishes[0]?.sustainability[0]?.rating).toBe(2);
    expect(
      menu.categories
        .flatMap((category) => category.dishes)
        .some((dish) => dish.id === "999"),
    ).toBe(false);
  });
});
