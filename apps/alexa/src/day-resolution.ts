const WEEKDAY_INDEX: Record<string, number> = {
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
};

export function resolveMenuDayRequest(
  slotValue: string | undefined,
  now: Date = new Date(),
  timeZone = "Europe/Berlin",
): string {
  const normalized = normalizeSlot(slotValue);

  if (!normalized || normalized === "heute") {
    return "today";
  }

  if (normalized === "morgen") {
    return "next_day";
  }

  const weekdayIndex = WEEKDAY_INDEX[normalized];

  if (weekdayIndex === undefined) {
    return "today";
  }

  return nextWeekdayIsoDate(weekdayIndex, now, timeZone);
}

function normalizeSlot(slotValue: string | undefined): string {
  return (slotValue ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nextWeekdayIsoDate(
  targetWeekday: number,
  now: Date,
  timeZone: string,
): string {
  const today = getCalendarDateInTimeZone(now, timeZone);
  const currentWeekday = getWeekdayNumber(today);
  const daysAhead =
    targetWeekday >= currentWeekday
      ? targetWeekday - currentWeekday
      : 7 - (currentWeekday - targetWeekday);

  const targetDate = new Date(`${today}T12:00:00Z`);
  targetDate.setUTCDate(targetDate.getUTCDate() + daysAhead);

  return targetDate.toISOString().slice(0, 10);
}

function getCalendarDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getWeekdayNumber(isoDate: string): number {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const day = date.getUTCDay();

  return day === 0 ? 7 : day;
}
