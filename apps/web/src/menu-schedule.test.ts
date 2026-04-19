import { describe, expect, it } from "vitest";

import { buildWeekdaySelection } from "./menu-schedule";

describe("buildWeekdaySelection", () => {
  it("defaults to the next weekday after the 15:00 cutoff", () => {
    const selection = buildWeekdaySelection(
      new Date("2026-04-14T13:05:00.000Z"),
    );

    expect(selection.selectedDate).toBe("2026-04-15");
    expect(selection.options.map((day) => day.isoDate)).toEqual([
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
    ]);
  });

  it("switches to next Monday after the Friday 14:30 cutoff", () => {
    const selection = buildWeekdaySelection(
      new Date("2026-04-17T12:35:00.000Z"),
    );

    expect(selection.selectedDate).toBe("2026-04-20");
    expect(selection.options.map((day) => day.isoDate)).toEqual([
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
    ]);
  });
});
