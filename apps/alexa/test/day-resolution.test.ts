import { describe, expect, it } from "vitest";

import { resolveMenuDayRequest } from "../src/day-resolution";

describe("resolveMenuDayRequest", () => {
  it("maps today and tomorrow to API tokens", () => {
    expect(resolveMenuDayRequest(undefined)).toBe("today");
    expect(resolveMenuDayRequest("heute")).toBe("today");
    expect(resolveMenuDayRequest("morgen")).toBe("next_day");
  });

  it("maps weekdays to the next matching ISO date in Europe/Berlin", () => {
    const reference = new Date("2026-04-15T08:00:00.000Z");

    expect(resolveMenuDayRequest("freitag", reference, "Europe/Berlin")).toBe(
      "2026-04-17",
    );
    expect(resolveMenuDayRequest("montag", reference, "Europe/Berlin")).toBe(
      "2026-04-20",
    );
  });
});
