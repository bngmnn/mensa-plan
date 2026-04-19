import { describe, expect, it } from "vitest";

import { MenuService } from "../src/menu-service";

function buildMenuHtml(serviceDates: string[]): string {
  return `
    <div class="tx-epwerkmenu-menu-location-wrapper" data-location="164">
      ${serviceDates
        .map(
          (serviceDate, index) => `
            <div
              class="tx-epwerkmenu-menu-timestamp-wrapper"
              data-timestamp="${serviceDate}"
            >
              <div class="menulist__categorywrapper">
                <h5 class="menulist__categorytitle">Category ${index + 1}</h5>
              </div>
              <div class="menue-tile" data-uid="dish-${index + 1}">
                <div class="singlemeal">
                  <div class="singlemeal__top">
                    <h5 class="singlemeal__headline">Dish ${index + 1}</h5>
                  </div>
                  <div class="singlemeal__bottom">
                    <dl class="dlist">
                      <dd class="dlist__item">
                        <span class="singlemeal__info">
                          <span class="singlemeal__info--semibold">2,20 €</span>
                          Studierende
                        </span>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

describe("MenuService", () => {
  it("resolves the published service date for token-based requests", async () => {
    const service = new MenuService(
      {
        fetchMenuPage: async (_locationId, day) => {
          expect(day).toBe("today");
          return buildMenuHtml(["2026-04-20"]);
        },
      },
      () => new Date("2026-04-18T10:00:00.000Z"),
    );

    const menu = await service.getMenu("164", "today");

    expect(menu.serviceDate).toBe("2026-04-20");
    expect(menu.stats.totalDishes).toBe(1);
  });

  it("loads ISO date requests from the published week view", async () => {
    const service = new MenuService(
      {
        fetchMenuPage: async (_locationId, day) => {
          expect(day).toBe("this_week");
          return buildMenuHtml(["2026-04-20", "2026-04-21"]);
        },
      },
      () => new Date("2026-04-20T10:00:00.000Z"),
    );

    const menu = await service.getMenu("164", "2026-04-21");

    expect(menu.serviceDate).toBe("2026-04-21");
    expect(menu.categories[0]?.dishes[0]?.name).toBe("Dish 2");
  });
});
