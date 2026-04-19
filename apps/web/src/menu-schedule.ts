const BERLIN_TIME_ZONE = "Europe/Berlin";
const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

interface BerlinNowParts {
  isoDate: string;
  weekday: WeekdayKey | "saturday" | "sunday";
  minutesSinceMidnight: number;
}

export interface WeekdayOption {
  isoDate: string;
  weekday: WeekdayKey;
  label: string;
  shortLabel: string;
  isToday: boolean;
}

export interface WeekdaySelection {
  selectedDate: string;
  weekLabel: string;
  options: WeekdayOption[];
}

export function buildWeekdaySelection(now = new Date()): WeekdaySelection {
  const berlinNow = getBerlinNowParts(now);
  const selectedDate = getDefaultServiceDate(berlinNow);
  return buildWeekdaySelectionFromDate(selectedDate, now);
}

export function buildWeekdaySelectionFromDate(
  selectedDate: string,
  now = new Date(),
): WeekdaySelection {
  const berlinNow = getBerlinNowParts(now);
  const weekStart = getMonday(selectedDate);

  return {
    selectedDate,
    weekLabel: formatWeekLabel(weekStart),
    options: WEEKDAY_KEYS.map((weekday, index) => {
      const isoDate = addDays(weekStart, index);

      return {
        isoDate,
        weekday,
        label: formatDate(isoDate, {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        shortLabel: formatDate(isoDate, {
          weekday: "short",
          day: "numeric",
        }),
        isToday: isoDate === berlinNow.isoDate,
      };
    }),
  };
}

export function formatServiceDate(isoDate: string): string {
  return formatDate(isoDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDefaultServiceDate({
  isoDate,
  weekday,
  minutesSinceMidnight,
}: BerlinNowParts): string {
  if (weekday === "saturday") {
    return addDays(isoDate, 2);
  }

  if (weekday === "sunday") {
    return addDays(isoDate, 1);
  }

  const fridayCutoffReached =
    weekday === "friday" && minutesSinceMidnight >= 14 * 60 + 30;

  if (fridayCutoffReached) {
    return addDays(isoDate, 3);
  }

  if (minutesSinceMidnight >= 15 * 60) {
    return weekday === "friday" ? addDays(isoDate, 3) : addDays(isoDate, 1);
  }

  return isoDate;
}

function getBerlinNowParts(now: Date): BerlinNowParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const weekday = parts.weekday.toLowerCase() as BerlinNowParts["weekday"];

  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutesSinceMidnight:
      Number.parseInt(parts.hour, 10) * 60 + Number.parseInt(parts.minute, 10),
  };
}

function getMonday(isoDate: string): string {
  const day = getUtcDate(isoDate).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(isoDate, offset);
}

function addDays(isoDate: string, amount: number): string {
  const date = getUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TIME_ZONE,
    ...options,
  }).format(getUtcDate(isoDate));
}

function formatWeekLabel(weekStart: string): string {
  const weekEnd = addDays(weekStart, 4);
  const sameMonth = weekStart.slice(0, 7) === weekEnd.slice(0, 7);
  const startLabel = formatDate(weekStart, {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  });
  const endLabel = formatDate(weekEnd, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}
